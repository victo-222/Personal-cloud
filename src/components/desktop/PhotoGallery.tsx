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

  // Rename photo
  const handleRenamePhoto = async (oldName: string, newName: string) => {
    if (!newName.trim()) return;
    
    const newPhotos = photos.map(p =>
      p.name === oldName ? { ...p, name: newName } : p
    );
    setPhotos(newPhotos);
    setEditingPhotoName(null);
    toast.success("Photo renamed");
  };

  // Toggle favorite
  const toggleFavorite = (fileName: string) => {
    if (favorites.includes(fileName)) {
      setFavorites(favorites.filter(f => f !== fileName));
    } else {
      setFavorites([...favorites, fileName]);
    }
    const newPhotos = photos.map(p =>
      p.name === fileName ? { ...p, favorite: !p.favorite } : p
    );
    setPhotos(newPhotos);
  };

  // Download photo
  const handleDownload = (url: string, name: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    toast.success("Photo downloaded");
  };

  // Copy to clipboard
  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  // Create album
  const handleCreateAlbum = () => {
    if (!newAlbumName.trim()) return;
    
    const newAlbum: Album = {
      id: Date.now().toString(),
      name: newAlbumName,
      photoCount: 0,
    };
    setAlbums([...albums, newAlbum]);
    setNewAlbumName("");
    setShowCreateAlbum(false);
    toast.success("Album created");
  };

  // Delete album
  const handleDeleteAlbum = (albumId: string) => {
    setAlbums(albums.filter(a => a.id !== albumId));
    if (selectedAlbum === albumId) setSelectedAlbum(null);
    toast.success("Album deleted");
  };

  // Rotate photo
  const rotatePhoto = () => {
    setRotation((rotation + 90) % 360);
  };

  // Reset filters
  const resetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setRotation(0);
  };

  // Sort photos
  const sortedPhotos = useMemo(() => {
    let sorted = [...photos];

    if (sortBy === "date") {
      sorted.sort((a, b) => (b.uploadedAt?.getTime() || 0) - (a.uploadedAt?.getTime() || 0));
    } else if (sortBy === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "size") {
      sorted.sort((a, b) => (b.size || 0) - (a.size || 0));
    }

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
