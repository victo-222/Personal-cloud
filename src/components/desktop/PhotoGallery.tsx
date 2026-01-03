import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload, Trash2, X, ZoomIn, Loader2, ImageIcon, Grid3x3, List, Fullscreen,
  Heart, Share2, Download, RotateCw, Crop, Sliders, Filter as FilterIcon,
  ChevronLeft, ChevronRight, Play, Pause, Settings, Copy, ExternalLink,
  Search as SearchIcon, Tag, Calendar, MapPin, Camera, Star, Folder, Plus,
  Edit3, Check, MoreVertical, Eye, EyeOff, Shuffle
} from "lucide-react";
import { toast } from "sonner";

interface Photo {
  name: string;
  url: string;
  uploadedAt?: Date;
  size?: number;
  favorite?: boolean;
  album?: string;
  tags?: string[];
  location?: string;
  cameraInfo?: string;
}

interface Album {
  id: string;
  name: string;
  photoCount: number;
}

type ViewMode = "grid" | "list" | "thumbnails";
type SortOption = "date" | "name" | "size" | "custom";

export const PhotoGallery = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [editingPhotoName, setEditingPhotoName] = useState<string | null>(null);
  const [newPhotoName, setNewPhotoName] = useState("");
  const [editingAlbumName, setEditingAlbumName] = useState<string | null>(null);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [editingPhotoIndex, setEditingPhotoIndex] = useState<number | null>(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterLocation, setFilterLocation] = useState<string>("");
  const [showDeletedPhotos, setShowDeletedPhotos] = useState(false);
  const [deletedPhotos, setDeletedPhotos] = useState<Photo[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slideshowInterval = useRef<NodeJS.Timeout | null>(null);

  // Fetch photos and albums
  const fetchPhotos = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.storage
      .from("user-photos")
      .list(user.id, { limit: 500, sortBy: { column: "created_at", order: "desc" } });

    if (error) {
      toast.error("Failed to load photos");
      return;
    }

    const photoUrls = data
      .filter(file => file.name !== ".emptyFolderPlaceholder")
      .map(file => ({
        name: file.name,
        url: supabase.storage.from("user-photos").getPublicUrl(`${user.id}/${file.name}`).data.publicUrl,
        uploadedAt: new Date(file.created_at || Date.now()),
        size: file.metadata?.size || 0,
        favorite: favorites.includes(file.name),
      }));

    setPhotos(photoUrls);
    setLoading(false);
  };

  // Upload handler
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error } = await supabase.storage
        .from("user-photos")
        .upload(filePath, file);

      if (error) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    toast.success("Photos uploaded successfully!");
    setUploading(false);
    fetchPhotos();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Delete handler (soft delete to trash)
  const handleDelete = async (fileName: string) => {
    const photo = photos.find(p => p.name === fileName);
    if (photo) {
      setDeletedPhotos([...deletedPhotos, photo]);
    }
    setPhotos(photos.filter(p => p.name !== fileName));
    toast.success("Photo moved to trash");
  };

  // Restore from trash
  const handleRestore = (photo: Photo) => {
    setPhotos([...photos, photo]);
    setDeletedPhotos(deletedPhotos.filter(p => p.name !== photo.name));
    toast.success("Photo restored");
  };

  // Rename photo overflow-hidden">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between gap-3 p-3 border-b border-border bg-card/50 flex-wrap">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/20 border border-primary/50 text-primary hover:bg-primary/30 transition-all disabled:opacity-50 text-sm"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>{uploading ? "Uploading..." : "Upload"}</span>
          </button>

          {selectedPhotos.length > 0 && (
            <>
              <button
                onClick={deleteSelected}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/20 border border-destructive/50 text-destructive hover:bg-destructive/30 transition-all text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete ({selectedPhotos.length})
              </button>
              <button
                onClick={deselectAll}
                className="px-3 py-2 rounded-lg bg-secondary/20 border border-secondary/50 text-secondary hover:bg-secondary/30 transition-all text-sm"
              >
                Deselect
              </button>
            </>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-xs">
          <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search photos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* View & Filter Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-primary/20 border border-primary/50 text-primary" : "bg-secondary/10 border border-border hover:bg-secondary/20"}`}
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-primary/20 border border-primary/50 text-primary" : "bg-secondary/10 border border-border hover:bg-secondary/20"}`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSlideshow(!showSlideshow)}
            className={`p-2 rounded-lg transition-all ${showSlideshow ? "bg-primary/20 border border-primary/50 text-primary" : "bg-secondary/10 border border-border hover:bg-secondary/20"}`}
          >
            <Play className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            className="p-2 rounded-lg bg-secondary/10 border border-border hover:bg-secondary/20 transition-all"
          >
            <FilterIcon className="w-4 h-4" />
          </button>
        </div>

        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {filteredPhotos.length} / {photos.length} photos
        </span>
      </div>

      {/* Advanced Search Panel */}
      {showAdvancedSearch && (
        <div className="p-3 border-b border-border bg-card/30 space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full mt-1 px-2 py-1 rounded border border-border bg-background text-sm"
              >
                <option value="date">Date</option>
                <option value="name">Name</option>
                <option value="size">Size</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Filter by Date</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full mt-1 px-2 py-1 rounded border border-border bg-background text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Filter by Location</label>
              <input
                type="text"
                placeholder="Location..."
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="w-full mt-1 px-2 py-1 rounded border border-border bg-background text-sm"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={() => {
                  setFilterDate("");
                  setFilterLocation("");
                  setFilterTag(null);
                }}
                className="px-3 py-1 rounded bg-secondary/20 border border-secondary/50 text-secondary hover:bg-secondary/30 transition-all text-sm flex-1"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar with Albums */}
        <div className="w-48 border-r border-border bg-card/30 overflow-y-auto p-3 space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Albums</h3>
              <button
                onClick={() => setShowCreateAlbum(true)}
                className="p-1 rounded hover:bg-secondary/20 transition-all"
              >
                <Plus className="w-4 h-4 text-primary" />
              </button>
            </div>

            {showCreateAlbum && (
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Album name..."
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  className="flex-1 px-2 py-1 rounded border border-border bg-background text-xs"
                  autoFocus
                />
                <button
                  onClick={handleCreateAlbum}
                  className="px-2 py-1 rounded bg-primary/20 hover:bg-primary/30 text-primary transition-all"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            )}

            {albums.map((album) => (
              <button
                key={album.id}
                onClick={() => setSelectedAlbum(album.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-all text-sm flex items-center justify-between group ${
                  selectedAlbum === album.id
                    ? "bg-primary/20 border border-primary/50 text-primary"
                    : "bg-secondary/10 border border-border hover:bg-secondary/20"
                }`}
              >
                <div>
                  <div className="font-medium">{album.name}</div>
                  <div className="text-xs opacity-75">{album.photoCount} photos</div>
                </div>
                {selectedAlbum === album.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAlbum(album.id);
                    }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-border space-y-2">
            <h4 className="font-semibold text-sm">Collections</h4>
            <button
              onClick={() => setShowDeletedPhotos(!showDeletedPhotos)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-all text-sm flex items-center gap-2 ${
                showDeletedPhotos
                  ? "bg-destructive/20 border border-destructive/50 text-destructive"
                  : "bg-secondary/10 border border-border hover:bg-secondary/20"
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Trash ({deletedPhotos.length})</span>
            </button>
            <button
              className="w-full text-left px-3 py-2 rounded-lg transition-all text-sm flex items-center gap-2 bg-secondary/10 border border-border hover:bg-secondary/20"
            >
              <Heart className="w-4 h-4" />
              <span>Favorites ({favorites.length})</span>
            </button>
          </div>
        </div>

        {/* Gallery Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : showDeletedPhotos ? (
            // Trash View
            deletedPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                <Trash2 className="w-16 h-16 opacity-50" />
                <p>Trash is empty</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {deletedPhotos.map((photo) => (
                  <div
                    key={photo.name}
                    className="group relative aspect-square rounded-lg overflow-hidden border border-destructive/50 hover:border-destructive transition-all"
                  >
                    <img
                      src={photo.url}
                      alt={photo.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleRestore(photo)}
                        className="absolute bottom-2 right-2 p-2 rounded-lg bg-primary/20 hover:bg-primary/40 transition-colors"
                      >
                        <RotateCw className="w-4 h-4 text-primary" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : showSlideshow && filteredPhotos.length > 0 ? (
            // Slideshow View
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="relative max-w-2xl w-full">
                <img
                  src={filteredPhotos[slideshowIndex].url}
                  alt="Slideshow"
                  className="w-full rounded-lg shadow-lg"
                />
                <div className="absolute inset-0 flex items-center justify-between p-4">
                  <button
                    onClick={() => setSlideshowIndex((slideshowIndex - 1 + filteredPhotos.length) % filteredPhotos.length)}
                    className="p-2 rounded-full bg-black/50 hover:bg-black/70 transition-all text-white"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => setSlideshowIndex((slideshowIndex + 1) % filteredPhotos.length)}
                    className="p-2 rounded-full bg-black/50 hover:bg-black/70 transition-all text-white"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {slideshowIndex + 1} / {filteredPhotos.length}
                </p>
                <p className="text-xs text-muted-foreground">{filteredPhotos[slideshowIndex].name}</p>
              </div>
            </div>
          ) : filteredPhotos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
              <ImageIcon className="w-16 h-16 opacity-50" />
              <p>{searchTerm ? "No photos match your search" : "No photos yet. Upload some to get started!"}</p>
            </div>
          ) : viewMode === "list" ? (
            // List View
            <div className="space-y-2">
              {filteredPhotos.map((photo) => (
                <div
                  key={photo.name}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedPhotos.includes(photo.name)
                      ? "bg-primary/10 border-primary/50"
                      : "bg-card/50 border-border hover:bg-card"
                  }`}
                  onClick={() => togglePhotoSelect(photo.name)}
                >
                  <input
                    type="checkbox"
                    checked={selectedPhotos.includes(photo.name)}
                    onChange={() => togglePhotoSelect(photo.name)}
                    className="w-4 h-4"
                  />
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="w-12 h-12 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{photo.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {photo.uploadedAt?.toLocaleDateString()} • {(photo.size || 0) / 1024 / 1024 | 0}MB
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(photo.name); }}
                      className={`p-2 rounded ${favorites.includes(photo.name) ? "text-red-500" : "text-muted-foreground hover:text-red-500"} transition-colors`}
                    >
                      <Heart className={`w-4 h-4 ${favorites.includes(photo.name) ? "fill-current" : ""}`} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedPhoto(photo.url); }}
                      className="p-2 rounded hover:bg-secondary/20 transition-colors"
                    >
                      <ZoomIn className="w-4 h-4 text-primary" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(photo.name); }}
                      className="p-2 rounded hover:bg-destructive/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Grid View
            <div className={`grid gap-3 ${viewMode === "thumbnails" ? "grid-cols-6" : "grid-cols-4"}`}>
              {filteredPhotos.map((photo) => (
                <div
                  key={photo.name}
                  onClick={() => togglePhotoSelect(photo.name)}
                  className={`group relative aspect-square rounded-lg overflow-hidden border cursor-pointer transition-all ${
                    selectedPhotos.includes(photo.name)
                      ? "bg-primary/10 border-primary/50 ring-2 ring-primary/30"
                      : "border-border/50 hover:border-primary/50"
                  }`}
                >
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />

                  {/* Selection Checkbox */}
                  <div className="absolute top-2 left-2">
                    <input
                      type="checkbox"
                      checked={selectedPhotos.includes(photo.name)}
                      onChange={() => togglePhotoSelect(photo.name)}
                      className="w-4 h-4 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Favorite Star */}
                  {favorites.includes(photo.name) && (
                    <div className="absolute top-2 right-2">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(photo.name); }}
                        className={`p-2 rounded-lg transition-colors ${
                          favorites.includes(photo.name)
                            ? "bg-red-500/40 text-red-200"
                            : "bg-primary/20 hover:bg-primary/40 text-primary"
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${favorites.includes(photo.name) ? "fill-current" : ""}`} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedPhoto(photo.url); }}
                        className="p-2 rounded-lg bg-primary/20 hover:bg-primary/40 transition-colors"
                      >
                        <ZoomIn className="w-4 h-4 text-primary" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(photo.name); }}
                        className="p-2 rounded-lg bg-destructive/20 hover:bg-destructive/40 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox / Viewer */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 p-2 rounded-lg bg-card/50 hover:bg-card transition-colors"
          >
            <X className="w-6 h-6 text-foreground" />
          </button>

          <div className="max-w-4xl w-full space-y-4">
            <div className="relative group">
              <img
                src={selectedPhoto}
                alt="Full size"
                className="w-full max-h-[70vh] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
                style={{
                  filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
                  transform: `rotate(${rotation}deg)`,
                }}
              />
              {showFilters && (
                <div className="absolute inset-0 bg-black/20 rounded-lg" />
              )}
            </div>

            {/* Photo Tools */}
            <div className="space-y-3 bg-card/80 backdrop-blur border border-border rounded-lg p-4">
              {/* Quick Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/20 border border-primary/50 text-primary hover:bg-primary/30 transition-all text-sm"
                  >
                    <Sliders className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => rotatePhoto()}
                    className="p-2 rounded-lg bg-secondary/20 border border-secondary/50 text-secondary hover:bg-secondary/30 transition-all"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      const photo = photos.find(p => p.url === selectedPhoto);
                      if (photo) toggleFavorite(photo.name);
                    }}
                    className="p-2 rounded-lg bg-secondary/20 border border-secondary/50 text-secondary hover:bg-secondary/30 transition-all"
                  >
                    <Heart className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleCopyLink(selectedPhoto)}
                    className="p-2 rounded-lg bg-secondary/20 border border-secondary/50 text-secondary hover:bg-secondary/30 transition-all"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDownload(selectedPhoto, "photo.jpg")}
                    className="p-2 rounded-lg bg-secondary/20 border border-secondary/50 text-secondary hover:bg-secondary/30 transition-all"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sliders */}
              {showFilters && (
                <div className="space-y-3 pt-3 border-t border-border">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Brightness</label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={brightness}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                      className="w-full mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Contrast</label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={contrast}
                      onChange={(e) => setContrast(Number(e.target.value))}
                      className="w-full mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Saturation</label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={saturation}
                      onChange={(e) => setSaturation(Number(e.target.value))}
                      className="w-full mt-1"
                    />
                  </div>
                  <button
                    onClick={resetFilters}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/20 border border-secondary/50 text-secondary hover:bg-secondary/30 transition-all text-sm"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          </div

    return sorted;
  }, [photos, sortBy]);

  // Filter photos
  const filteredPhotos = useMemo(() => {
    return sortedPhotos.filter(photo => {
      const matchesSearch = !searchTerm || 
        photo.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTag = !filterTag || photo.tags?.includes(filterTag);
      const matchesDate = !filterDate || 
        (photo.uploadedAt?.toDateString().includes(filterDate));
      const matchesLocation = !filterLocation || 
        (photo.location?.toLowerCase().includes(filterLocation.toLowerCase()));

      return matchesSearch && matchesTag && matchesDate && matchesLocation;
    });
  }, [sortedPhotos, searchTerm, filterTag, filterDate, filterLocation]);

  // Slideshow handler
  useEffect(() => {
    if (showSlideshow && filteredPhotos.length > 0) {
      slideshowInterval.current = setInterval(() => {
        setSlideshowIndex((prev) => (prev + 1) % filteredPhotos.length);
      }, 3000);
    }
    return () => {
      if (slideshowInterval.current) clearInterval(slideshowInterval.current);
    };
  }, [showSlideshow, filteredPhotos.length]);

  // Multi-select handlers
  const togglePhotoSelect = (fileName: string) => {
    if (selectedPhotos.includes(fileName)) {
      setSelectedPhotos(selectedPhotos.filter(f => f !== fileName));
    } else {
      setSelectedPhotos([...selectedPhotos, fileName]);
    }
  };

  const selectAll = () => {
    setSelectedPhotos(filteredPhotos.map(p => p.name));
  };

  const deselectAll = () => {
    setSelectedPhotos([]);
  };

  const deleteSelected = async () => {
    selectedPhotos.forEach(fileName => handleDelete(fileName));
    setSelectedPhotos([]);
    toast.success(`${selectedPhotos.length} photos deleted`);
  };

  const moveSelected = (albumId: string) => {
    // This would update album assignments in a real database
    toast.success(`${selectedPhotos.length} photos moved to album`);
    setSelectedPhotos([]
    setUploading(false);
    fetchPhotos();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (fileName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.storage
      .from("user-photos")
      .remove([`${user.id}/${fileName}`]);

    if (error) {
      toast.error("Failed to delete photo");
      return;
    }

    toast.success("Photo deleted");
    setPhotos(photos.filter(p => p.name !== fileName));
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-3 p-3 border-b border-border bg-card/50">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 border border-primary/50 text-primary hover:bg-primary/30 transition-all disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span className="text-sm font-medium">{uploading ? "Uploading..." : "Upload Photos"}</span>
        </button>
        <span className="text-sm text-muted-foreground">{photos.length} photos</span>
      </div>

      {/* Gallery Grid */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <ImageIcon className="w-16 h-16 opacity-50" />
            <p>No photos yet. Upload some to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {photos.map((photo) => (
              <div
                key={photo.name}
                className="group relative aspect-square rounded-lg overflow-hidden border border-border/50 hover:border-primary/50 transition-all cursor-pointer"
              >
                <img
                  src={photo.url}
                  alt={photo.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  onClick={() => setSelectedPhoto(photo.url)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                    <button
                      onClick={() => setSelectedPhoto(photo.url)}
                      className="p-2 rounded-lg bg-primary/20 hover:bg-primary/40 transition-colors"
                    >
                      <ZoomIn className="w-4 h-4 text-primary" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(photo.name); }}
                      className="p-2 rounded-lg bg-destructive/20 hover:bg-destructive/40 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 p-2 rounded-lg bg-card/50 hover:bg-card transition-colors"
          >
            <X className="w-6 h-6 text-foreground" />
          </button>
          <img
            src={selectedPhoto}
            alt="Full size"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
