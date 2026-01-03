import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  Folder, FileText, Plus, Trash2, Edit2, Download, Upload, Copy, Move, Search as SearchIcon, Image as ImageIcon, Code, Music, GripVertical,
  ChevronLeft, ChevronRight, Home, Heart, Clock, HardDrive, Zap, Settings, Eye, EyeOff, Archive, Share2, MoreVertical, List, LayoutGrid,
  Grid3x3, FileImage, Calendar, HardDriveIcon, FileUp, Link as LinkIcon, X, LogOut
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserFile {
  id: string;
  name: string;
  content: string | null;
  file_type: string;
  parent_folder: string;
  created_at?: string;
  size?: number;
}

interface Tab {
  id: string;
  path: string[];
  label: string;
}

type ViewMode = "grid" | "list" | "details" | "tiles" | "thumbnails";
type SortOption = "name" | "size" | "type" | "date";
type GroupOption = "none" | "type" | "date";

export const FileManager = () => {
  // Core state
  const [files, setFiles] = useState<UserFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<UserFile | null>(null);
  
  // UI state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [groupBy, setGroupBy] = useState<GroupOption>("none");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [multiSelect, setMultiSelect] = useState<string[]>([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [showExtensions, setShowExtensions] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<{ items: string[], operation: "copy" | "cut" } | null>(null);
  const [trash, setTrash] = useState<UserFile[]>([]);
  const [showTrash, setShowTrash] = useState(false);
  
  // Tabs and navigation
  const [tabs, setTabs] = useState<Tab[]>([{ id: "1", path: ["root"], label: "Home" }]);
  const [activeTab, setActiveTab] = useState("1");
  const [pathInput, setPathInput] = useState("");
  const [showAddressBar, setShowAddressBar] = useState(false);
  
  // Advanced search state
  const [advancedSearch, setAdvancedSearch] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    type: "",
    minSize: 0,
    maxSize: 0,
    dateAfter: "",
    dateBefore: "",
  });
  
  // Creation and UI
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [createType, setCreateType] = useState<"file" | "folder">("file");
  const { toast } = useToast();

  // Get active folder stack for current tab
  const getActiveFolderStack = () => {
    const tab = tabs.find(t => t.id === activeTab);
    return tab?.path || ["root"];
  };

  const setActiveFolderStack = (path: string[]) => {
    setTabs(prev => prev.map(t => t.id === activeTab ? { ...t, path } : t));
    setSelectedFile(null);
  };

  const activeFolderStack = getActiveFolderStack();
  const activeFolder = activeFolderStack[activeFolderStack.length - 1] ?? "root";

  const fetchFiles = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentPath = showTrash ? "trash" : activeFolder;
    const { data } = await supabase
      .from("user_files")
      .select("*")
      .eq("user_id", user.id)
      .eq("parent_folder", currentPath)
      .order("file_type", { ascending: false })
      .order("name");

    if (data) setFiles(data);
  }, [activeFolder, showTrash]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Navigation helpers
  const goBack = () => {
    const currentPath = getActiveFolderStack();
    if (currentPath.length > 1) {
      setActiveFolderStack(currentPath.slice(0, -1));
    }
  };

  const goForward = () => {
    toast({ title: "Info", description: "Forward navigation available with history" });
  };

  const navigateUp = () => {
    const currentPath = getActiveFolderStack();
    setActiveFolderStack(currentPath.length > 1 ? currentPath.slice(0, -1) : ["root"]);
    setSelectedFile(null);
  };

  const navigateToPath = (path: string) => {
    const folders = path.split("/").filter(f => f.length > 0);
    setActiveFolderStack(folders.length > 0 ? folders : ["root"]);
    setShowAddressBar(false);
  };

  const openNewTab = () => {
    const newId = Date.now().toString();
    setTabs([...tabs, { id: newId, path: ["root"], label: "Home" }]);
    setActiveTab(newId);
  };

  const closeTab = (id: string) => {
    if (tabs.length === 1) {
      toast({ title: "Info", description: "At least one tab must remain open" });
      return;
    }
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTab === id) {
      setActiveTab(newTabs[0].id);
    }
  };

  // File operations
  const createItem = async () => {
    if (!newName.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("user_files").insert({
      user_id: user.id,
      name: newName,
      content: createType === "file" ? "" : null,
      file_type: createType === "folder" ? "folder" : "text",
      parent_folder: activeFolder,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setNewName("");
    setIsCreating(false);
    fetchFiles();
    toast({ title: "Created", description: `${createType === "folder" ? "Folder" : "File"} created` });
  };

  const deleteItem = async (id: string, toTrash = true) => {
    if (toTrash) {
      const item = files.find(f => f.id === id);
      if (item) {
        const { error } = await supabase.from("user_files").update({ parent_folder: "trash" }).eq("id", id);
        if (error) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
          return;
        }
        setTrash([...trash, item]);
        toast({ title: "Deleted", description: "Item moved to trash" });
      }
    } else {
      const { error } = await supabase.from("user_files").delete().eq("id", id);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Permanently deleted", description: "Item cannot be recovered" });
    }
    setSelectedFile(null);
    fetchFiles();
  };

  const emptyTrash = async () => {
    for (const item of trash) {
      await supabase.from("user_files").delete().eq("id", item.id);
    }
    setTrash([]);
    fetchFiles();
    toast({ title: "Trash emptied" });
  };

  const restoreFromTrash = async (id: string) => {
    const item = trash.find(f => f.id === id);
    if (!item) return;
    const { error } = await supabase.from("user_files").update({ parent_folder: "root" }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setTrash(trash.filter(f => f.id !== id));
    fetchFiles();
    toast({ title: "Restored", description: "Item restored to home folder" });
  };

  const openItem = (file: UserFile) => {
    if (file.file_type === "folder") {
      setActiveFolderStack([...getActiveFolderStack(), file.name]);
      setSelectedFile(null);
    } else {
      setSelectedFile(file);
    }
  };

  const renameItem = async (id: string) => {
    const item = files.find((f) => f.id === id);
    if (!item) return;
    const newNamePrompt = window.prompt("Rename item", item.name);
    if (!newNamePrompt || newNamePrompt.trim() === item.name) return;
    const { error } = await supabase.from("user_files").update({ name: newNamePrompt }).eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    fetchFiles();
    toast({ title: "Renamed", description: "Item renamed" });
  };

  const downloadItem = (file: UserFile) => {
    if (!file.content) return toast({ title: "Empty", description: "No content to download" });
    try {
      const blob = new Blob([file.content], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Downloaded", description: `${file.name} downloaded` });
    } catch (e) {
      toast({ title: "Error", description: "Failed to download" , variant: "destructive"});
    }
  };

  // Clipboard operations
  const copyFiles = (ids: string[]) => {
    setClipboard({ items: ids, operation: "copy" });
    toast({ title: "Copied", description: `${ids.length} item(s) copied` });
  };

  const cutFiles = (ids: string[]) => {
    setClipboard({ items: ids, operation: "cut" });
    toast({ title: "Cut", description: `${ids.length} item(s) cut` });
  };

  const pasteFiles = async () => {
    if (!clipboard) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    for (const id of clipboard.items) {
      if (clipboard.operation === "cut") {
        await supabase.from("user_files").update({ parent_folder: activeFolder }).eq("id", id);
      } else {
        const file = files.find(f => f.id === id);
        if (file) {
          await supabase.from("user_files").insert({
            user_id: user.id,
            name: `${file.name} (Copy)`,
            content: file.content,
            file_type: file.file_type,
            parent_folder: activeFolder,
          });
        }
      }
    }

    setClipboard(null);
    fetchFiles();
    toast({ title: "Pasted", description: "Items pasted successfully" });
  };

  const moveItemToFolder = async (itemId: string, targetFolderName: string) => {
    const { error } = await supabase.from("user_files").update({ parent_folder: targetFolderName }).eq("id", itemId);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    fetchFiles();
    toast({ title: "Moved", description: `Item moved to ${targetFolderName}` });
  };

  const toggleFavorite = (folderName: string) => {
    setFavorites(prev => prev.includes(folderName) ? prev.filter(f => f !== folderName) : [...prev, folderName]);
  };

  // Search and filter helpers
  const filterFiles = (fileList: UserFile[]) => {
    let result = fileList.slice();

    // Text search
    if (searchTerm.trim()) {
      result = result.filter((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // Advanced filters
    if (advancedSearch) {
      if (searchFilters.type) {
        result = result.filter((f) => f.file_type.includes(searchFilters.type));
      }
      if (searchFilters.minSize > 0 && searchFilters.maxSize > 0) {
        result = result.filter((f) => {
          const size = f.content?.length || 0;
          return size >= searchFilters.minSize && size <= searchFilters.maxSize;
        });
      }
    }

    return result;
  };

  const sortFiles = (fileList: UserFile[]) => {
    const result = fileList.slice();
    
    switch (sortBy) {
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "size":
        result.sort((a, b) => (b.content?.length || 0) - (a.content?.length || 0));
        break;
      case "type":
        result.sort((a, b) => a.file_type.localeCompare(b.file_type));
        break;
      case "date":
        result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        break;
    }
    
    return result;
  };

  const groupFiles = (fileList: UserFile[]) => {
    if (groupBy === "none") return { "": fileList };

    const grouped: Record<string, UserFile[]> = {};

    for (const file of fileList) {
      let key = "";
      if (groupBy === "type") {
        key = file.file_type;
      } else if (groupBy === "date") {
        const date = new Date(file.created_at || Date.now());
        key = date.toLocaleDateString();
      }

      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(file);
    }

    return grouped;
  };

  const handleUploadFiles = async (filesList: FileList | null) => {
    if (!filesList) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast({ title: "Not signed in" });
    
    for (let i = 0; i < filesList.length; i++) {
      const f = filesList[i];
      const text = await f.text();
      const fileType = f.type || "binary";
      const { error } = await supabase.from("user_files").insert({
        user_id: user.id,
        name: f.name,
        content: text,
        file_type: fileType.startsWith("image") ? "image" : "text",
        parent_folder: activeFolder,
      });
      if (error) toast({ title: "Upload error", description: error.message, variant: "destructive" });
    }
    fetchFiles();
    toast({ title: "Uploaded", description: `${filesList.length} file(s) uploaded` });
  };

  const toggleSelect = (id: string) => {
    setMultiSelect((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const selectAll = () => {
    setMultiSelect(files.map(f => f.id));
  };

  const deselectAll = () => {
    setMultiSelect([]);
  };

  const getFileIcon = (fileType: string, fileName: string) => {
    if (fileType === "folder") return <Folder className="w-6 h-6 text-blue-500" />;
    if (fileType === "image") return <ImageIcon className="w-6 h-6 text-purple-500" />;
    if (fileType.includes("audio") || fileName.endsWith(".mp3")) return <Music className="w-6 h-6 text-pink-500" />;
    if (fileType.includes("text") || fileType === "text") return <Code className="w-6 h-6 text-green-500" />;
    if (fileName.endsWith(".zip") || fileName.endsWith(".rar") || fileName.endsWith(".7z")) return <Archive className="w-6 h-6 text-yellow-600" />;
    return <FileText className="w-6 h-6 text-slate-500" />;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "c" && selectedFile) {
          e.preventDefault();
          copyFiles([selectedFile.id]);
        } else if (e.key === "x" && selectedFile) {
          e.preventDefault();
          cutFiles([selectedFile.id]);
        } else if (e.key === "v") {
          e.preventDefault();
          pasteFiles();
        } else if (e.key === "a") {
          e.preventDefault();
          selectAll();
        } else if (e.key === "n") {
          e.preventDefault();
          setIsCreating(true);
          setCreateType("file");
        }
      } else if (e.key === "Delete" && selectedFile) {
        e.preventDefault();
        deleteItem(selectedFile.id);
      } else if (e.key === "F5") {
        e.preventDefault();
        fetchFiles();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedFile, activeFolder, clipboard]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Tabs Bar */}
      <div className="flex items-center bg-card border-b border-border px-2 py-1 overflow-x-auto">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-t border-b-2 cursor-pointer transition-colors ${
              activeTab === tab.id
                ? "bg-primary/10 border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:bg-card/50"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <Home className="w-4 h-4" />
            <span className="text-sm max-w-xs truncate">{tab.label}</span>
            {tabs.length > 1 && (
              <X
                className="w-3 h-3 hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
              />
            )}
          </div>
        ))}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          onClick={openNewTab}
          title="Open new tab"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Navigation & Address Bar */}
      <div className="flex items-center gap-2 p-2 bg-card border-b border-border flex-wrap">
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={goBack} title="Back">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={goForward} title="Forward" disabled>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={navigateUp} title="Up">
            <ChevronLeft className="w-4 h-4 rotate-90" />
          </Button>
        </div>

        {/* Address Bar */}
        <div className="flex items-center gap-1 flex-1 max-w-md">
          {showAddressBar ? (
            <input
              type="text"
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && navigateToPath(pathInput)}
              placeholder="Enter path..."
              className="flex-1 px-2 py-1 text-sm bg-background border border-border rounded focus:border-primary outline-none"
              autoFocus
            />
          ) : (
            <button
              onClick={() => { setShowAddressBar(true); setPathInput(getActiveFolderStack().join("/")); }}
              className="flex-1 px-2 py-1 text-sm bg-background border border-border rounded hover:bg-background/80 truncate text-left"
            >
              / {getActiveFolderStack().slice(1).join("/")}
            </button>
          )}
        </div>

        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground flex-wrap flex gap-1">
          {getActiveFolderStack().map((f, idx) => (
            <button
              key={idx}
              onClick={() => setActiveFolderStack(getActiveFolderStack().slice(0, idx + 1))}
              className="hover:underline hover:text-foreground px-1 py-0.5 rounded hover:bg-primary/10 transition-colors"
            >
              {f === "root" ? "Home" : f}
              {idx < getActiveFolderStack().length - 1 && <span className="ml-1">/</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Sidebar + Main Content */}
      <div className="h-full flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-52 bg-card/30 border-r border-border p-3 overflow-y-auto">
          {/* Quick Access */}
          <div className="mb-4">
            <h3 className="font-semibold text-xs text-muted-foreground mb-2 uppercase">Quick Access</h3>
            <div className="space-y-1">
              <button
                onClick={() => setActiveFolderStack(["root"])}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-primary/10 transition-colors ${
                  activeFolder === "root" ? "bg-primary/20" : ""
                }`}
              >
                <Home className="w-4 h-4 text-primary" />
                <span>Home</span>
              </button>
              <button
                onClick={() => setShowTrash(!showTrash)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-primary/10 transition-colors ${
                  showTrash ? "bg-primary/20" : ""
                }`}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
                <span>Trash ({trash.length})</span>
              </button>
            </div>
          </div>

          {/* Favorites */}
          {favorites.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold text-xs text-muted-foreground mb-2 uppercase">Favorites</h3>
              <div className="space-y-1">
                {favorites.map((fav) => (
                  <button
                    key={fav}
                    onClick={() => setActiveFolderStack([...getActiveFolderStack().slice(0, 1), fav])}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-primary/10 transition-colors justify-between group"
                  >
                    <span className="flex items-center gap-2 truncate flex-1">
                      <Heart className="w-4 h-4 text-pink-500 fill-current" />
                      <span className="truncate">{fav}</span>
                    </span>
                    <X
                      className="w-3 h-3 opacity-0 group-hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(fav); }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Drives */}
          <div className="mb-4">
            <h3 className="font-semibold text-xs text-muted-foreground mb-2 uppercase">Drives</h3>
            <div className="space-y-1">
              <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-primary/10 transition-colors">
                <HardDrive className="w-4 h-4" />
                <span>This PC</span>
              </button>
            </div>
          </div>

          {/* Tools */}
          <div className="pt-3 border-t border-border/50">
            <h3 className="font-semibold text-xs text-muted-foreground mb-2 uppercase">Tools</h3>
            <div className="space-y-1">
              <button
                onClick={() => setAdvancedSearch(!advancedSearch)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-primary/10 transition-colors"
              >
                <SearchIcon className="w-4 h-4" />
                <span>Search</span>
              </button>
              <button
                onClick={() => setShowHidden(!showHidden)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-primary/10 transition-colors"
              >
                {showHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span>{showHidden ? "Hide" : "Show"} Hidden</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-2 p-2 bg-card border-b border-border flex-wrap">
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-2 py-1 text-sm bg-background border border-border rounded focus:border-primary outline-none"
              />
              <SearchIcon className="absolute right-2 top-2 w-4 h-4 text-muted-foreground" />
            </div>

            {/* View Mode */}
            <div className="flex items-center gap-1 border border-border rounded p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1 rounded ${viewMode === "grid" ? "bg-primary/20" : "hover:bg-background"}`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1 rounded ${viewMode === "list" ? "bg-primary/20" : "hover:bg-background"}`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("details")}
                className={`p-1 rounded ${viewMode === "details" ? "bg-primary/20" : "hover:bg-background"}`}
                title="Details view"
              >
                <FileUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("thumbnails")}
                className={`p-1 rounded ${viewMode === "thumbnails" ? "bg-primary/20" : "hover:bg-background"}`}
                title="Thumbnails view"
              >
                <FileImage className="w-4 h-4" />
              </button>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="text-sm px-2 py-1 bg-background border border-border rounded focus:border-primary outline-none"
              title="Sort by"
            >
              <option value="name">Sort: Name</option>
              <option value="type">Sort: Type</option>
              <option value="size">Sort: Size</option>
              <option value="date">Sort: Date</option>
            </select>

            {/* Group */}
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupOption)}
              className="text-sm px-2 py-1 bg-background border border-border rounded focus:border-primary outline-none"
              title="Group by"
            >
              <option value="none">Group: None</option>
              <option value="type">Group: Type</option>
              <option value="date">Group: Date</option>
            </select>

            <div className="flex-1" />

            {/* Batch Actions */}
            {multiSelect.length > 0 && (
              <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded">
                <span className="text-xs text-muted-foreground">{multiSelect.length} selected</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyFiles(multiSelect)}
                  title="Copy (Ctrl+C)"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => cutFiles(multiSelect)}
                  title="Cut (Ctrl+X)"
                >
                  <Move className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { multiSelect.forEach(id => deleteItem(id)); deselectAll(); }}
                  className="text-destructive"
                  title="Delete (Delete)"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={deselectAll}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Main Actions */}
            <input ref={fileInputRef} type="file" multiple onChange={(e) => handleUploadFiles(e.target.files)} className="hidden" />
            <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()} title="Upload files">
              <Upload className="w-4 h-4 mr-1" /> Upload
            </Button>
            <Button size="sm" variant="ghost" onClick={clipboard ? pasteFiles : undefined} disabled={!clipboard} title="Paste (Ctrl+V)">
              <Copy className="w-4 h-4 mr-1" /> Paste
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setIsCreating(true); setCreateType("folder"); }} title="New Folder">
              <Folder className="w-4 h-4 mr-1" /> New Folder
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setIsCreating(true); setCreateType("file"); }} title="New File (Ctrl+N)">
              <Plus className="w-4 h-4 mr-1" /> New File
            </Button>
          </div>

          {/* Advanced Search Panel */}
          {advancedSearch && (
            <div className="p-3 bg-card/50 border-b border-border space-y-2">
              <div className="grid grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder="File type"
                  value={searchFilters.type}
                  onChange={(e) => setSearchFilters({...searchFilters, type: e.target.value})}
                  className="px-2 py-1 text-sm bg-background border border-border rounded focus:border-primary outline-none"
                />
                <input
                  type="number"
                  placeholder="Min size (bytes)"
                  value={searchFilters.minSize}
                  onChange={(e) => setSearchFilters({...searchFilters, minSize: parseInt(e.target.value) || 0})}
                  className="px-2 py-1 text-sm bg-background border border-border rounded focus:border-primary outline-none"
                />
                <input
                  type="number"
                  placeholder="Max size (bytes)"
                  value={searchFilters.maxSize}
                  onChange={(e) => setSearchFilters({...searchFilters, maxSize: parseInt(e.target.value) || 0})}
                  className="px-2 py-1 text-sm bg-background border border-border rounded focus:border-primary outline-none"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setAdvancedSearch(false); setSearchTerm(""); }}
                >
                  <X className="w-4 h-4" /> Close
                </Button>
              </div>
            </div>
          )}

          {/* Create dialog */}
          {isCreating && (
            <div className="p-2 bg-card/50 border-b border-border flex items-center gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={`New ${createType} name...`}
                className="flex-1 px-2 py-1 text-sm bg-background border border-border rounded focus:border-primary outline-none"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && createItem()}
              />
              <Button size="sm" onClick={createItem}>Create</Button>
              <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
            </div>
          )}

          {/* Files View */}
          <div className="flex-1 flex overflow-hidden">
            {/* Files Container */}
            <div className="flex-1 p-4 overflow-auto">
              {(() => {
                let list = filterFiles(files);
                list = sortFiles(list);
                const grouped = groupFiles(list);

                if (showTrash && trash.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Trash2 className="w-12 h-12 mb-2 opacity-50" />
                      <p>Trash is empty</p>
                      {trash.length === 0 && (
                        <Button variant="ghost" className="mt-4" onClick={() => setShowTrash(false)}>
                          Go Back
                        </Button>
                      )}
                    </div>
                  );
                }

                if (list.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Folder className="w-12 h-12 mb-2 opacity-50" />
                      <p>This folder is empty</p>
                    </div>
                  );
                }

                if (viewMode === "grid") {
                  return (
                    <div className="grid grid-cols-4 gap-4">
                      {Object.entries(grouped).map(([group, groupFiles]) => (
                        <div key={group} className="col-span-4">
                          {group && <h3 className="font-semibold text-sm mb-2 text-muted-foreground">{group}</h3>}
                          <div className="grid grid-cols-4 gap-4">
                            {groupFiles.map((file) => (
                              <div
                                key={file.id}
                                draggable={true}
                                onDragStart={() => setDraggedItem(file.id)}
                                onDragEnd={() => setDraggedItem(null)}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  if (file.file_type === "folder") setDragOverFolder(file.id);
                                }}
                                onDragLeave={() => setDragOverFolder(null)}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  if (draggedItem && file.file_type === "folder") {
                                    moveItemToFolder(draggedItem, file.name);
                                    setDragOverFolder(null);
                                  }
                                }}
                                onDoubleClick={() => openItem(file)}
                                onClick={() => setSelectedFile(file)}
                                onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, id: file.id }); }}
                                className={`flex flex-col items-center gap-2 p-3 rounded-lg cursor-pointer transition-all ${
                                  selectedFile?.id === file.id ? "bg-primary/20 shadow-md" : "hover:bg-card"
                                } ${dragOverFolder === file.id ? "bg-primary/30 border-2 border-primary" : ""} ${draggedItem === file.id ? "opacity-50" : ""}`}
                              >
                                <div className="flex items-start w-full justify-between">
                                  <input type="checkbox" checked={multiSelect.includes(file.id)} onChange={() => toggleSelect(file.id)} onClick={(e) => e.stopPropagation()} className="accent-primary" />
                                  {draggedItem === file.id && <GripVertical className="w-4 h-4 text-muted-foreground" />}
                                </div>
                                <div style={{ width: 'calc(var(--desktop-icon-size) * 0.9)', height: 'calc(var(--desktop-icon-size) * 0.9)' }} className="flex items-center justify-center">
                                  {getFileIcon(file.file_type, file.name)}
                                </div>
                                <span className="text-sm text-center truncate w-full">{file.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                } else if (viewMode === "list") {
                  return (
                    <div className="space-y-1">
                      {list.map((file) => (
                        <div
                          key={file.id}
                          onClick={() => setSelectedFile(file)}
                          onDoubleClick={() => openItem(file)}
                          onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, id: file.id }); }}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                            selectedFile?.id === file.id ? "bg-primary/20" : "hover:bg-card"
                          }`}
                        >
                          <input type="checkbox" checked={multiSelect.includes(file.id)} onChange={() => toggleSelect(file.id)} onClick={(e) => e.stopPropagation()} className="accent-primary" />
                          {getFileIcon(file.file_type, file.name)}
                          <span className="flex-1 text-sm truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground w-16 text-right">{file.file_type}</span>
                        </div>
                      ))}
                    </div>
                  );
                } else if (viewMode === "details") {
                  return (
                    <div className="w-full overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-border sticky top-0 bg-card">
                          <tr>
                            <th className="text-left px-2 py-1"><input type="checkbox" checked={multiSelect.length === list.length && list.length > 0} onChange={multiSelect.length === list.length && list.length > 0 ? deselectAll : selectAll} className="accent-primary" /></th>
                            <th className="text-left px-2 py-1">Name</th>
                            <th className="text-left px-2 py-1">Type</th>
                            <th className="text-right px-2 py-1">Size</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.map((file) => (
                            <tr
                              key={file.id}
                              onClick={() => setSelectedFile(file)}
                              onDoubleClick={() => openItem(file)}
                              onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, id: file.id }); }}
                              className={`border-b border-border/50 cursor-pointer transition-colors ${
                                selectedFile?.id === file.id ? "bg-primary/20" : "hover:bg-card"
                              }`}
                            >
                              <td className="px-2 py-1"><input type="checkbox" checked={multiSelect.includes(file.id)} onChange={() => toggleSelect(file.id)} onClick={(e) => e.stopPropagation()} className="accent-primary" /></td>
                              <td className="px-2 py-1 flex items-center gap-2"><span>{getFileIcon(file.file_type, file.name)}</span> {file.name}</td>
                              <td className="px-2 py-1">{file.file_type}</td>
                              <td className="px-2 py-1 text-right text-muted-foreground">{file.content ? `${file.content.length} B` : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                } else if (viewMode === "thumbnails") {
                  return (
                    <div className="grid grid-cols-6 gap-4">
                      {list.map((file) => (
                        <div
                          key={file.id}
                          onClick={() => setSelectedFile(file)}
                          onDoubleClick={() => openItem(file)}
                          onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, id: file.id }); }}
                          className={`flex flex-col items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                            selectedFile?.id === file.id ? "bg-primary/20 shadow-md" : "hover:bg-card"
                          }`}
                        >
                          <div className="w-16 h-16 flex items-center justify-center bg-background rounded border border-border/50">
                            {file.file_type === "image" && file.content ? (
                              <img src={file.content} alt={file.name} className="w-full h-full object-cover rounded" />
                            ) : (
                              getFileIcon(file.file_type, file.name)
                            )}
                          </div>
                          <span className="text-xs text-center truncate w-full">{file.name}</span>
                        </div>
                      ))}
                    </div>
                  );
                }
              })()}
            </div>

            {/* File Preview & Details */}
            {selectedFile && (
              <div className="w-96 bg-card/50 border-l border-border p-4 overflow-auto flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {getFileIcon(selectedFile.file_type, selectedFile.name)}
                    <h3 className="font-semibold text-sm truncate">{selectedFile.name}</h3>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedFile(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* File Actions */}
                <div className="space-y-2 mb-4">
                  {selectedFile.file_type !== "folder" && (
                    <>
                      <Button size="sm" className="w-full" onClick={() => renameItem(selectedFile.id)} variant="secondary">
                        <Edit2 className="w-4 h-4 mr-2" /> Rename
                      </Button>
                      <Button size="sm" className="w-full" onClick={() => downloadItem(selectedFile)} variant="secondary">
                        <Download className="w-4 h-4 mr-2" /> Download
                      </Button>
                      <Button size="sm" className="w-full" onClick={() => copyFiles([selectedFile.id])} variant="secondary">
                        <Copy className="w-4 h-4 mr-2" /> Copy
                      </Button>
                      <Button size="sm" className="w-full" onClick={() => { navigator.clipboard?.writeText(selectedFile.name); toast({ title: "Copied" }); }} variant="secondary">
                        <LinkIcon className="w-4 h-4 mr-2" /> Copy Name
                      </Button>
                      <Button size="sm" className="w-full" onClick={() => toggleFavorite(selectedFile.name)} variant="secondary">
                        <Heart className={`w-4 h-4 mr-2 ${favorites.includes(selectedFile.name) ? "fill-current" : ""}`} /> {favorites.includes(selectedFile.name) ? "Remove" : "Add"} Favorite
                      </Button>
                    </>
                  )}
                  <Button size="sm" className="w-full" onClick={() => deleteItem(selectedFile.id)} variant="destructive">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </Button>
                </div>

                {/* File Info */}
                <div className="bg-background/50 p-3 rounded mb-3 border border-border/50">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Information</h4>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>Name:</strong> {selectedFile.name}</p>
                    <p><strong>Type:</strong> {selectedFile.file_type === "folder" ? "Folder" : selectedFile.file_type}</p>
                    <p><strong>Size:</strong> {selectedFile.content ? `${selectedFile.content.length} bytes` : "—"}</p>
                    <p><strong>Location:</strong> /{selectedFile.parent_folder}</p>
                    {selectedFile.created_at && <p><strong>Created:</strong> {new Date(selectedFile.created_at).toLocaleDateString()}</p>}
                  </div>
                </div>

                {/* Preview */}
                {selectedFile.content && selectedFile.file_type === "image" && (
                  <div className="mb-3">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Preview</h4>
                    <img src={selectedFile.content} alt={selectedFile.name} className="w-full rounded border border-border/50 max-h-48 object-cover" />
                  </div>
                )}

                {selectedFile.content && selectedFile.file_type !== "image" && selectedFile.file_type !== "folder" && (
                  <div className="mb-3">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Preview</h4>
                    <div className="bg-black/50 rounded border border-border/50 text-xs font-mono text-green-400 max-h-48 overflow-auto p-2">
                      <pre className="whitespace-pre-wrap break-words">{selectedFile.content.substring(0, 500)}{selectedFile.content.length > 500 ? "..." : ""}</pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Context Menu */}
            {contextMenu && (
              <div
                style={{ left: contextMenu.x, top: contextMenu.y }}
                className="fixed z-50 bg-card border border-border rounded shadow-lg p-1 min-w-max"
                onMouseLeave={() => setContextMenu(null)}
              >
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-primary/10 rounded transition-colors"
                  onClick={() => { 
                    const item = files.find(f => f.id === contextMenu.id);
                    if (item) openItem(item);
                    setContextMenu(null); 
                  }}
                >
                  <FileUp className="w-4 h-4" /> Open
                </button>
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-primary/10 rounded transition-colors"
                  onClick={() => { renameItem(contextMenu.id); setContextMenu(null); }}
                >
                  <Edit2 className="w-4 h-4" /> Rename
                </button>
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-primary/10 rounded transition-colors"
                  onClick={() => { downloadItem(files.find(f => f.id === contextMenu.id)!); setContextMenu(null); }}
                >
                  <Download className="w-4 h-4" /> Download
                </button>
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-primary/10 rounded transition-colors"
                  onClick={() => { copyFiles([contextMenu.id]); setContextMenu(null); }}
                >
                  <Copy className="w-4 h-4" /> Copy
                </button>
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-primary/10 rounded transition-colors"
                  onClick={() => { cutFiles([contextMenu.id]); setContextMenu(null); }}
                >
                  <Move className="w-4 h-4" /> Cut
                </button>
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-primary/10 rounded transition-colors"
                  onClick={() => { 
                    const item = files.find(f => f.id === contextMenu.id);
                    if (item) toggleFavorite(item.name);
                    setContextMenu(null); 
                  }}
                >
                  <Heart className="w-4 h-4" /> Toggle Favorite
                </button>
                <hr className="my-1 border-border/50" />
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-destructive/10 text-destructive rounded transition-colors"
                  onClick={() => { deleteItem(contextMenu.id); setContextMenu(null); }}
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
