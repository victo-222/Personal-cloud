import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Loader2, Mail, Calendar, Trophy, Shield, Plus, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserProfile {
  user_id: string;
  username: string | null;
  email?: string | null;
  avatar_url: string | null;
  points?: number | null;
  is_admin?: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export const AdminUsersPanel = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"points" | "username" | "created">("points");
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [pointsToAdd, setPointsToAdd] = useState<number>(0);

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order(sortBy === "points" ? "points" : sortBy === "username" ? "username" : "created_at", {
          ascending: sortBy !== "points",
        });

      if (error) {
        console.error("Error fetching users:", error);
      } else {
        setUsers(data || []);
      }
    } catch (e) {
      console.error("Failed to fetch users:", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const search = searchTerm.toLowerCase();
    return (
      (user.username?.toLowerCase().includes(search) || false) ||
      (user.email?.toLowerCase().includes(search) || false)
    );
  });

  const handleSort = (newSort: typeof sortBy) => {
    setSortBy(newSort);
    // Re-fetch with new sort
    setLoading(true);
    setTimeout(() => {
      fetchAllUsers();
    }, 300);
  };

  const updateUserPoints = async (userId: string, newPoints: number) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ points: Math.max(0, newPoints) })
        .eq("user_id", userId);

      if (error) {
        console.error("Error updating points:", error);
        return false;
      }

      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.user_id === userId ? { ...u, points: Math.max(0, newPoints) } : u
        )
      );
      return true;
    } catch (e) {
      console.error("Failed to update points:", e);
      return false;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background to-card/50">
      {/* Header */}
      <div className="p-4 bg-card border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">CloudSpace Users</h2>
            <p className="text-xs text-muted-foreground">{filteredUsers.length} of {users.length} users</p>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by username or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Sort Buttons */}
      <div className="flex gap-2 p-3 bg-card/50 border-b border-border/50 flex-wrap">
        <button
          onClick={() => handleSort("points")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
            sortBy === "points"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          🏆 Points
        </button>
        <button
          onClick={() => handleSort("username")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
            sortBy === "username"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          👤 Username
        </button>
        <button
          onClick={() => handleSort("created")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
            sortBy === "created"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          📅 Joined
        </button>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-muted-foreground text-sm">Loading users...</p>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-center">
              {searchTerm ? "No users found matching your search" : "No users yet"}
            </p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div
              key={user.user_id}
              className="p-3 bg-card border border-border rounded-lg hover:bg-card/80 transition-colors group cursor-pointer"
              onClick={() => setEditingUser(user)}
            >
              {/* User Header */}
              <div className="flex items-start gap-3 mb-2">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.username || "User"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">
                      {user.username?.[0]?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate">
                      {user.username || "Unnamed User"}
                    </h3>
                    {user.is_admin && (
                      <div title="Admin"><Shield className="w-4 h-4 text-yellow-500 flex-shrink-0" /></div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>

                {/* Points Badge */}
                <div className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-2.5 py-1 rounded-lg flex-shrink-0">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span className="font-bold text-yellow-500 text-sm">
                    {user.points || 0}
                  </span>
                </div>
              </div>

              {/* User Details */}
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  <span className="truncate">{user.email || "N/A"}</span>
                </div>
                {user.created_at && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {new Date(user.created_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "2-digit",
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Status Bar */}
              <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-2">
                <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                    style={{ width: `${Math.min((user.points || 0) / 5, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {Math.min((user.points || 0) / 5, 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Stats */}
      {!loading && (
        <div className="p-3 bg-card border-t border-border text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>👥 Total Users:</span>
            <span className="font-semibold text-foreground">{users.length}</span>
          </div>
          <div className="flex justify-between">
            <span>🛡️ Admins:</span>
            <span className="font-semibold text-yellow-500">
              {users.filter((u) => u.is_admin).length}
            </span>
          </div>
          <div className="flex justify-between">
            <span>🏆 Total Points:</span>
            <span className="font-semibold text-green-500">
              {users.reduce((sum, u) => sum + (u.points || 0), 0)}
            </span>
          </div>
        </div>
      )}

      {/* Edit Points Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Manage Points</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-background rounded border border-border/50">
              <p className="text-sm font-semibold text-foreground mb-1">
                User: {editingUser.username || "Unnamed"}
              </p>
              <p className="text-xs text-muted-foreground">{editingUser.email || "N/A"}</p>
            </div>

            <div className="mb-6 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded border border-yellow-500/20">
              <p className="text-xs text-muted-foreground mb-1">Current Points</p>
              <p className="text-3xl font-bold text-yellow-500">{editingUser.points || 0}</p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => updateUserPoints(editingUser.user_id, (editingUser.points || 0) + 10)}
                  className="flex-1"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add 10
                </Button>
                <Button
                  size="sm"
                  onClick={() => updateUserPoints(editingUser.user_id, (editingUser.points || 0) + 50)}
                  className="flex-1"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add 50
                </Button>
                <Button
                  size="sm"
                  onClick={() => updateUserPoints(editingUser.user_id, (editingUser.points || 0) + 100)}
                  className="flex-1"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add 100
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => updateUserPoints(editingUser.user_id, Math.max(0, (editingUser.points || 0) - 10))}
                  className="flex-1"
                >
                  <Minus className="w-4 h-4 mr-1" /> -10
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => updateUserPoints(editingUser.user_id, Math.max(0, (editingUser.points || 0) - 50))}
                  className="flex-1"
                >
                  <Minus className="w-4 h-4 mr-1" /> -50
                </Button>
              </div>

              <div className="flex gap-2">
                <input
                  type="number"
                  value={pointsToAdd}
                  onChange={(e) => setPointsToAdd(parseInt(e.target.value) || 0)}
                  placeholder="Custom amount"
                  className="flex-1 px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    updateUserPoints(editingUser.user_id, (editingUser.points || 0) + pointsToAdd);
                    setPointsToAdd(0);
                  }}
                  className="flex-1"
                >
                  Set
                </Button>
              </div>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => updateUserPoints(editingUser.user_id, 0)}
                className="w-full"
              >
                Reset to 0
              </Button>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditingUser(null)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
