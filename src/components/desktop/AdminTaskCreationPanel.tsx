import React, { useState } from 'react';
import { adminTaskService, type TaskCategory, type TaskDifficulty } from '../../lib/admin-task-rewards';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface AdminTaskCreationPanelProps {
  adminId: string;
  adminName: string;
  onClose?: () => void;
}

const neonStyle = `
  .task-neon-input {
    border-color: #00ff00 !important;
    color: #00ff00 !important;
    background: rgba(0, 10, 40, 0.8) !important;
    box-shadow: 0 0 10px rgba(0, 255, 0, 0.3) !important;
    text-shadow: 0 0 10px rgba(0, 255, 0, 0.5) !important;
  }

  .task-neon-input::placeholder {
    color: rgba(0, 255, 0, 0.5) !important;
  }

  .task-neon-input:focus {
    box-shadow: 0 0 20px rgba(0, 255, 0, 0.6) !important;
    border-color: #00ffff !important;
  }

  .task-neon-button {
    background: linear-gradient(135deg, #00ff00, #00ffff) !important;
    color: #0a0e27 !important;
    border: 2px solid #00ff00 !important;
    font-weight: bold !important;
    box-shadow: 0 0 15px rgba(0, 255, 0, 0.5) !important;
    text-shadow: 0 0 5px rgba(0, 255, 0, 0.3) !important;
  }

  .task-neon-button:hover {
    box-shadow: 0 0 30px rgba(0, 255, 0, 0.8) !important;
    transform: scale(1.02) !important;
  }

  .task-neon-card {
    background: rgba(15, 21, 51, 0.8) !important;
    border: 2px solid #00ff00 !important;
    box-shadow: 0 0 20px rgba(0, 255, 0, 0.3) !important;
    backdrop-filter: blur(10px) !important;
  }

  .task-neon-title {
    color: #00ff00 !important;
    text-shadow: 0 0 15px rgba(0, 255, 0, 0.6) !important;
    font-weight: bold !important;
  }

  .task-neon-text {
    color: #00ff00 !important;
    text-shadow: 0 0 10px rgba(0, 255, 0, 0.4) !important;
  }

  .task-item {
    background: rgba(10, 14, 40, 0.6) !important;
    border-left: 4px solid #00ff00 !important;
    box-shadow: inset 0 0 10px rgba(0, 255, 0, 0.1) !important;
    transition: all 0.3s ease !important;
  }

  .task-item:hover {
    border-left-color: #00ffff !important;
    background: rgba(15, 21, 51, 0.8) !important;
    box-shadow: inset 0 0 15px rgba(0, 255, 0, 0.1), 0 0 15px rgba(0, 255, 255, 0.2) !important;
  }

  .difficulty-easy {
    background: rgba(0, 255, 0, 0.1) !important;
    border: 1px solid #00ff00 !important;
  }

  .difficulty-medium {
    background: rgba(255, 255, 0, 0.1) !important;
    border: 1px solid #ffff00 !important;
  }

  .difficulty-hard {
    background: rgba(255, 100, 0, 0.1) !important;
    border: 1px solid #ff6400 !important;
  }

  .difficulty-expert {
    background: rgba(255, 0, 0, 0.1) !important;
    border: 1px solid #ff0000 !important;
  }

  .task-status-active {
    border-left-color: #00ff00 !important;
  }

  .task-status-paused {
    border-left-color: #ffff00 !important;
  }
`;

export const AdminTaskCreationPanel: React.FC<AdminTaskCreationPanelProps> = ({ adminId, adminName, onClose }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'manage' | 'leaderboard'>('create');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('engagement');
  const [difficulty, setDifficulty] = useState<TaskDifficulty>('medium');
  const [pointReward, setPointReward] = useState(100);
  const [maxCompletions, setMaxCompletions] = useState(100);
  const [maxCompletionsPerUser, setMaxCompletionsPerUser] = useState(1);
  const [daysToExpire, setDaysToExpire] = useState(0);
  const [creating, setCreating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [tasks, setTasks] = useState(adminTaskService.getAllTasks());
  const [leaderboard, setLeaderboard] = useState(adminTaskService.getLeaderboard());
  const [stats, setStats] = useState(adminTaskService.getAllTaskStatistics());

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setCreating(true);

    try {
      const expiresAt = daysToExpire > 0 ? new Date(Date.now() + daysToExpire * 24 * 60 * 60 * 1000) : undefined;

      const newTask = adminTaskService.createTask(
        adminId,
        title,
        description,
        category,
        difficulty,
        pointReward,
        maxCompletions,
        maxCompletionsPerUser,
        expiresAt
      );

      setTasks(adminTaskService.getAllTasks());
      setStats(adminTaskService.getAllTaskStatistics());

      setTitle('');
      setDescription('');
      setCategory('engagement');
      setDifficulty('medium');
      setPointReward(100);
      setMaxCompletions(100);
      setMaxCompletionsPerUser(1);
      setDaysToExpire(0);
      setSuccessMessage('✅ Task created successfully!');

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  const handlePauseTask = (taskId: string) => {
    adminTaskService.pauseTask(taskId, adminId);
    setTasks(adminTaskService.getAllTasks());
  };

  const handleResumeTask = (taskId: string) => {
    adminTaskService.resumeTask(taskId, adminId);
    setTasks(adminTaskService.getAllTasks());
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      adminTaskService.deleteTask(taskId, adminId);
      setTasks(adminTaskService.getAllTasks());
      setSelectedTaskId(null);
    }
  };

  const selectedTask = selectedTaskId ? adminTaskService.getTask(selectedTaskId) : null;
  const selectedTaskStats = selectedTask ? stats[selectedTask.id] : null;

  return (
    <>
      <style>{neonStyle}</style>

      <div className="w-full max-w-6xl mx-auto p-2 md:p-4">
        <Card className="task-neon-card">
          <CardHeader>
            <CardTitle className="task-neon-title">🎯 Admin Task Management</CardTitle>
            <CardDescription className="task-neon-text">
              Create tasks for users to earn points and engagement rewards
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
              <TabsList className="grid w-full grid-cols-3 bg-gray-900 border-2 border-green-500/50 rounded-lg">
                <TabsTrigger value="create" className="data-[state=active]:bg-green-500/30 text-xs md:text-sm">
                  ➕ Create Task
                </TabsTrigger>
                <TabsTrigger value="manage" className="data-[state=active]:bg-green-500/30 text-xs md:text-sm">
                  ⚙️ Manage ({tasks.length})
                </TabsTrigger>
                <TabsTrigger value="leaderboard" className="data-[state=active]:bg-green-500/30 text-xs md:text-sm">
                  🏆 Leaderboard
                </TabsTrigger>
              </TabsList>

              {/* Create Task Tab */}
              <TabsContent value="create" className="space-y-4 mt-4">
                {successMessage && (
                  <div className="p-3 bg-green-500/20 border-l-4 border-green-400 rounded task-neon-text">
                    {successMessage}
                  </div>
                )}

                <form onSubmit={handleCreateTask} className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="task-neon-text block text-sm font-bold mb-2">Task Title</label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter task title..."
                      className="task-neon-input text-xs md:text-sm"
                      disabled={creating}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="task-neon-text block text-sm font-bold mb-2">Description</label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what users need to do..."
                      className="task-neon-input text-xs md:text-sm min-h-24"
                      disabled={creating}
                    />
                  </div>

                  {/* Category & Difficulty */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="task-neon-text block text-sm font-bold mb-2">Category</label>
                      <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                        <SelectTrigger className="task-neon-input text-xs md:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-2 border-green-500/50">
                          <SelectItem value="engagement" className="task-neon-text">
                            👥 Engagement
                          </SelectItem>
                          <SelectItem value="content" className="task-neon-text">
                            📝 Content
                          </SelectItem>
                          <SelectItem value="referral" className="task-neon-text">
                            🔗 Referral
                          </SelectItem>
                          <SelectItem value="testing" className="task-neon-text">
                            🧪 Testing
                          </SelectItem>
                          <SelectItem value="community" className="task-neon-text">
                            🌐 Community
                          </SelectItem>
                          <SelectItem value="custom" className="task-neon-text">
                            ✨ Custom
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="task-neon-text block text-sm font-bold mb-2">Difficulty</label>
                      <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)}>
                        <SelectTrigger className="task-neon-input text-xs md:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-2 border-green-500/50">
                          <SelectItem value="easy" className="task-neon-text">
                            🟢 Easy
                          </SelectItem>
                          <SelectItem value="medium" className="task-neon-text">
                            🟡 Medium
                          </SelectItem>
                          <SelectItem value="hard" className="task-neon-text">
                            🔴 Hard
                          </SelectItem>
                          <SelectItem value="expert" className="task-neon-text">
                            ⚫ Expert
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Points & Limits */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="task-neon-text block text-sm font-bold mb-2">
                        Points Reward: {pointReward}
                      </label>
                      <Input
                        type="number"
                        value={pointReward}
                        onChange={(e) => setPointReward(Math.max(1, parseInt(e.target.value) || 1))}
                        className="task-neon-input text-xs md:text-sm"
                        disabled={creating}
                      />
                    </div>

                    <div>
                      <label className="task-neon-text block text-sm font-bold mb-2">
                        Max Total Completions: {maxCompletions}
                      </label>
                      <Input
                        type="number"
                        value={maxCompletions}
                        onChange={(e) => setMaxCompletions(Math.max(1, parseInt(e.target.value) || 1))}
                        className="task-neon-input text-xs md:text-sm"
                        disabled={creating}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="task-neon-text block text-sm font-bold mb-2">
                        Per User Limit: {maxCompletionsPerUser}
                      </label>
                      <Input
                        type="number"
                        value={maxCompletionsPerUser}
                        onChange={(e) => setMaxCompletionsPerUser(Math.max(1, parseInt(e.target.value) || 1))}
                        className="task-neon-input text-xs md:text-sm"
                        disabled={creating}
                      />
                    </div>

                    <div>
                      <label className="task-neon-text block text-sm font-bold mb-2">
                        Days to Expire (0 = no expiration): {daysToExpire}
                      </label>
                      <Input
                        type="number"
                        value={daysToExpire}
                        onChange={(e) => setDaysToExpire(Math.max(0, parseInt(e.target.value) || 0))}
                        className="task-neon-input text-xs md:text-sm"
                        disabled={creating}
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button className="task-neon-button w-full text-xs md:text-sm" disabled={creating} type="submit">
                    {creating ? '⏳ Creating...' : '✨ Create Task'}
                  </Button>
                </form>
              </TabsContent>

              {/* Manage Tasks Tab */}
              <TabsContent value="manage" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Tasks List */}
                  <div className="lg:col-span-1 space-y-2">
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {tasks.length === 0 ? (
                        <p className="task-neon-text text-center py-4 text-xs md:text-sm">No tasks created yet</p>
                      ) : (
                        tasks.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => setSelectedTaskId(task.id)}
                            className={`task-item p-3 rounded cursor-pointer transition-all ${
                              selectedTaskId === task.id ? 'ring-2 ring-cyan-400' : ''
                            } ${task.status === 'paused' ? 'task-status-paused' : 'task-status-active'}`}
                          >
                            <div className="task-neon-title text-xs md:text-sm font-bold truncate">{task.title}</div>
                            <div className="task-neon-text text-xs mt-1">{task.category}</div>
                            <div className="flex gap-1 mt-2 flex-wrap">
                              <Badge
                                className={`text-xs font-bold difficulty-${task.difficulty}`}
                              >
                                {getDifficultyEmoji(task.difficulty)} {task.difficulty}
                              </Badge>
                              <Badge className="text-xs bg-cyan-500/20 text-cyan-300 font-bold">
                                {task.pointReward}⭐
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Task Details */}
                  <div className="lg:col-span-2">
                    {selectedTask ? (
                      <div className="space-y-4">
                        <Card className="task-neon-card">
                          <CardHeader>
                            <CardTitle className="task-neon-title text-sm md:text-base">{selectedTask.title}</CardTitle>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge className={`text-xs font-bold difficulty-${selectedTask.difficulty}`}>
                                {getDifficultyEmoji(selectedTask.difficulty)} {selectedTask.difficulty}
                              </Badge>
                              <Badge className="text-xs bg-cyan-500/20 text-cyan-300 font-bold">
                                {selectedTask.pointReward}⭐ per completion
                              </Badge>
                              <Badge
                                className={`text-xs font-bold ${
                                  selectedTask.status === 'active'
                                    ? 'bg-green-500/20 text-green-300'
                                    : 'bg-yellow-500/20 text-yellow-300'
                                }`}
                              >
                                {selectedTask.status === 'active' ? '🟢' : '⏸️'} {selectedTask.status}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <p className="task-neon-text text-xs md:text-sm">{selectedTask.description}</p>

                            {/* Statistics */}
                            {selectedTaskStats && (
                              <div className="grid grid-cols-2 gap-2">
                                <StatCard label="Total Points" value={selectedTaskStats.totalPointsDistributed} />
                                <StatCard label="Users" value={selectedTaskStats.totalUsersCompleted} />
                              </div>
                            )}

                            {/* Progress Bar */}
                            <div>
                              <div className="task-neon-text text-xs font-bold mb-1">
                                Completions: {selectedTask.currentCompletions}/{selectedTask.maxCompletions}
                              </div>
                              <div className="w-full bg-gray-700 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-green-400 to-cyan-400 h-2 rounded-full transition-all"
                                  style={{
                                    width: `${(selectedTask.currentCompletions / selectedTask.maxCompletions) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 flex-wrap">
                              {selectedTask.status === 'active' ? (
                                <Button
                                  onClick={() => handlePauseTask(selectedTask.id)}
                                  className="task-neon-button flex-1 text-xs md:text-sm"
                                >
                                  ⏸️ Pause
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => handleResumeTask(selectedTask.id)}
                                  className="task-neon-button flex-1 text-xs md:text-sm"
                                >
                                  ▶️ Resume
                                </Button>
                              )}
                              <Button
                                onClick={() => handleDeleteTask(selectedTask.id)}
                                variant="destructive"
                                className="flex-1 text-xs md:text-sm"
                              >
                                🗑️ Delete
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="task-neon-text text-center">Select a task to view details</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Leaderboard Tab */}
              <TabsContent value="leaderboard" className="space-y-4 mt-4">
                <Card className="task-neon-card">
                  <CardHeader>
                    <CardTitle className="task-neon-title">🏆 Top Task Earners</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {leaderboard.length === 0 ? (
                        <p className="task-neon-text text-center py-4">No completions yet</p>
                      ) : (
                        leaderboard.map((entry, index) => (
                          <div
                            key={entry.userId}
                            className="flex items-center gap-3 p-3 bg-gray-900/50 rounded border-l-4 border-green-400"
                          >
                            <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">
                              #{index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="task-neon-title text-sm font-bold">{entry.username}</div>
                              <div className="task-neon-text text-xs">
                                {entry.tasksCompleted} tasks • {entry.pointsEarned}⭐
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Close Button */}
            {onClose && (
              <div className="mt-6">
                <Button variant="outline" className="task-neon-button w-full text-xs md:text-sm" onClick={onClose}>
                  ✕ Close Task Manager
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

function StatCard({ label, value }: { label: string; value: string | number }): JSX.Element {
  return (
    <div className="border-2 border-green-500/50 bg-green-500/10 rounded p-2 text-center">
      <div className="text-xs font-bold text-gray-400">{label}</div>
      <div className="text-base md:text-lg font-bold text-green-400">{value}</div>
    </div>
  );
}

function getDifficultyEmoji(difficulty: TaskDifficulty): string {
  const emojis: Record<TaskDifficulty, string> = {
    easy: '🟢',
    medium: '🟡',
    hard: '🔴',
    expert: '⚫',
  };
  return emojis[difficulty];
}
