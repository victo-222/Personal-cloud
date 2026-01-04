// Admin Task & Rewards System
// Allows admin to create tasks for users to earn points

export type TaskStatus = 'active' | 'paused' | 'completed' | 'expired' | 'archived';
export type TaskDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type TaskCategory = 'engagement' | 'content' | 'referral' | 'testing' | 'community' | 'custom';

export interface AdminTask {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  difficulty: TaskDifficulty;
  pointReward: number;
  maxCompletions: number; // total times task can be completed by any user
  currentCompletions: number;
  maxCompletionsPerUser: number; // how many times one user can complete
  status: TaskStatus;
  createdBy: string; // admin ID
  createdAt: Date;
  expiresAt?: Date;
  updatedAt: Date;
  metadata: {
    description_extended?: string;
    instructions?: string;
    verificationMethod?: 'auto' | 'manual'; // auto = instant reward, manual = admin approves
    tags?: string[];
    icon?: string;
  };
}

export interface UserTaskCompletion {
  id: string;
  userId: string;
  username: string;
  taskId: string;
  completedAt: Date;
  pointsEarned: number;
  status: 'pending' | 'approved' | 'rejected'; // for manual verification
  approvedBy?: string; // admin ID
  approvedAt?: Date;
  rejectionReason?: string;
  evidence?: string; // URL or description of completion evidence
}

export interface TaskReward {
  taskId: string;
  totalPointsDistributed: number;
  totalUsersCompleted: number;
  completionRate: number; // percentage of max completions
  averageCompletionTime: number; // seconds
}

export class AdminTaskService {
  private tasks: Map<string, AdminTask> = new Map();
  private taskCompletions: Map<string, UserTaskCompletion[]> = new Map();
  private userTaskHistory: Map<string, UserTaskCompletion[]> = new Map();

  constructor() {
    // Initialize service
  }

  // ============================================
  // TASK MANAGEMENT
  // ============================================

  /**
   * Create new task
   */
  createTask(
    adminId: string,
    title: string,
    description: string,
    category: TaskCategory,
    difficulty: TaskDifficulty,
    pointReward: number,
    maxCompletions: number = 100,
    maxCompletionsPerUser: number = 1,
    expiresAt?: Date
  ): AdminTask {
    const id = `task-${Date.now()}-${Math.random()}`;

    const task: AdminTask = {
      id,
      title,
      description,
      category,
      difficulty,
      pointReward,
      maxCompletions,
      currentCompletions: 0,
      maxCompletionsPerUser,
      status: 'active',
      createdBy: adminId,
      createdAt: new Date(),
      expiresAt,
      updatedAt: new Date(),
      metadata: {
        verificationMethod: 'auto',
      },
    };

    this.tasks.set(id, task);
    this.taskCompletions.set(id, []);

    return task;
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): AdminTask | null {
    return this.tasks.get(taskId) || null;
  }

  /**
   * Get all active tasks for users
   */
  getActiveTasks(): AdminTask[] {
    return Array.from(this.tasks.values())
      .filter((t) => t.status === 'active' && (!t.expiresAt || t.expiresAt > new Date()))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get all tasks (admin view)
   */
  getAllTasks(filter?: { status?: TaskStatus; category?: TaskCategory; createdBy?: string }): AdminTask[] {
    let tasks = Array.from(this.tasks.values());

    if (filter?.status) {
      tasks = tasks.filter((t) => t.status === filter.status);
    }

    if (filter?.category) {
      tasks = tasks.filter((t) => t.category === filter.category);
    }

    if (filter?.createdBy) {
      tasks = tasks.filter((t) => t.createdBy === filter.createdBy);
    }

    return tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Update task
   */
  updateTask(taskId: string, updates: Partial<AdminTask>, adminId: string): AdminTask | null {
    const task = this.tasks.get(taskId);
    if (!task || task.createdBy !== adminId) return null;

    Object.assign(task, updates, { updatedAt: new Date() });

    return task;
  }

  /**
   * Update task metadata
   */
  updateTaskMetadata(
    taskId: string,
    metadata: Partial<AdminTask['metadata']>,
    adminId: string
  ): AdminTask | null {
    const task = this.tasks.get(taskId);
    if (!task || task.createdBy !== adminId) return null;

    task.metadata = { ...task.metadata, ...metadata };
    task.updatedAt = new Date();

    return task;
  }

  /**
   * Pause task
   */
  pauseTask(taskId: string, adminId: string): AdminTask | null {
    const task = this.tasks.get(taskId);
    if (!task || task.createdBy !== adminId) return null;

    task.status = 'paused';
    task.updatedAt = new Date();

    return task;
  }

  /**
   * Resume task
   */
  resumeTask(taskId: string, adminId: string): AdminTask | null {
    const task = this.tasks.get(taskId);
    if (!task || task.createdBy !== adminId) return null;

    task.status = 'active';
    task.updatedAt = new Date();

    return task;
  }

  /**
   * Delete task
   */
  deleteTask(taskId: string, adminId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.createdBy !== adminId) return false;

    this.tasks.delete(taskId);
    this.taskCompletions.delete(taskId);

    return true;
  }

  // ============================================
  // TASK COMPLETION
  // ============================================

  /**
   * Mark task as completed by user
   */
  completeTask(
    userId: string,
    username: string,
    taskId: string,
    evidence?: string
  ): { completion: UserTaskCompletion | null; pointsAwarded: number; message: string } {
    const task = this.tasks.get(taskId);
    if (!task) return { completion: null, pointsAwarded: 0, message: 'Task not found' };

    if (task.status !== 'active') {
      return { completion: null, pointsAwarded: 0, message: 'Task is not active' };
    }

    if (task.expiresAt && task.expiresAt < new Date()) {
      return { completion: null, pointsAwarded: 0, message: 'Task has expired' };
    }

    if (task.currentCompletions >= task.maxCompletions) {
      return { completion: null, pointsAwarded: 0, message: 'Task completion limit reached' };
    }

    // Check user completion limit
    const userCompletions = this.getUserTaskCompletions(userId, taskId);
    const approvedUserCompletions = userCompletions.filter((c) => c.status === 'approved').length;

    if (approvedUserCompletions >= task.maxCompletionsPerUser) {
      return { completion: null, pointsAwarded: 0, message: 'User completion limit reached for this task' };
    }

    const completion: UserTaskCompletion = {
      id: `completion-${taskId}-${userId}-${Date.now()}`,
      userId,
      username,
      taskId,
      completedAt: new Date(),
      pointsEarned: task.pointReward,
      status: task.metadata.verificationMethod === 'manual' ? 'pending' : 'approved',
      evidence,
    };

    if (task.metadata.verificationMethod === 'auto') {
      completion.approvedBy = 'system';
      completion.approvedAt = new Date();
    }

    const completions = this.taskCompletions.get(taskId) || [];
    completions.push(completion);
    this.taskCompletions.set(taskId, completions);

    // Add to user history
    if (!this.userTaskHistory.has(userId)) {
      this.userTaskHistory.set(userId, []);
    }
    this.userTaskHistory.get(userId)!.push(completion);

    // Update task completion count
    if (completion.status === 'approved') {
      task.currentCompletions++;
    }

    return {
      completion,
      pointsAwarded: completion.status === 'approved' ? task.pointReward : 0,
      message: 'Task completed successfully',
    };
  }

  /**
   * Get task completions for a specific user
   */
  getUserTaskCompletions(userId: string, taskId?: string): UserTaskCompletion[] {
    if (taskId) {
      const completions = this.taskCompletions.get(taskId) || [];
      return completions.filter((c) => c.userId === userId);
    }

    return this.userTaskHistory.get(userId) || [];
  }

  /**
   * Get all completions for a task
   */
  getTaskCompletions(taskId: string, status?: 'pending' | 'approved' | 'rejected'): UserTaskCompletion[] {
    const completions = this.taskCompletions.get(taskId) || [];

    if (status) {
      return completions.filter((c) => c.status === status);
    }

    return completions;
  }

  /**
   * Approve task completion (for manual verification)
   */
  approveCompletion(completionId: string, adminId: string): UserTaskCompletion | null {
    for (const completions of this.taskCompletions.values()) {
      const completion = completions.find((c) => c.id === completionId);
      if (completion) {
        completion.status = 'approved';
        completion.approvedBy = adminId;
        completion.approvedAt = new Date();

        // Update task completion count
        const task = this.tasks.get(completion.taskId);
        if (task) {
          task.currentCompletions++;
        }

        return completion;
      }
    }

    return null;
  }

  /**
   * Reject task completion (for manual verification)
   */
  rejectCompletion(completionId: string, adminId: string, reason: string): UserTaskCompletion | null {
    for (const completions of this.taskCompletions.values()) {
      const completion = completions.find((c) => c.id === completionId);
      if (completion) {
        completion.status = 'rejected';
        completion.rejectionReason = reason;

        return completion;
      }
    }

    return null;
  }

  // ============================================
  // ANALYTICS & STATISTICS
  // ============================================

  /**
   * Get task statistics
   */
  getTaskStatistics(taskId: string): TaskReward | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const completions = this.taskCompletions.get(taskId) || [];
    const approvedCompletions = completions.filter((c) => c.status === 'approved');

    const totalPointsDistributed = approvedCompletions.reduce((sum, c) => sum + c.pointsEarned, 0);

    return {
      taskId,
      totalPointsDistributed,
      totalUsersCompleted: new Set(approvedCompletions.map((c) => c.userId)).size,
      completionRate: (task.currentCompletions / task.maxCompletions) * 100,
      averageCompletionTime: 0, // would need timestamp tracking
    };
  }

  /**
   * Get all task statistics
   */
  getAllTaskStatistics(): Record<string, TaskReward> {
    const stats: Record<string, TaskReward> = {};

    for (const [taskId] of this.tasks) {
      const taskStats = this.getTaskStatistics(taskId);
      if (taskStats) {
        stats[taskId] = taskStats;
      }
    }

    return stats;
  }

  /**
   * Get top tasks by points distributed
   */
  getTopTasks(limit: number = 10): AdminTask[] {
    const tasks = Array.from(this.tasks.values());

    return tasks
      .map((task) => ({
        task,
        stats: this.getTaskStatistics(task.id),
      }))
      .sort((a, b) => (b.stats?.totalPointsDistributed || 0) - (a.stats?.totalPointsDistributed || 0))
      .slice(0, limit)
      .map((item) => item.task);
  }

  /**
   * Get tasks by category
   */
  getTasksByCategory(category: TaskCategory): AdminTask[] {
    return this.getActiveTasks().filter((t) => t.category === category);
  }

  /**
   * Get tasks by difficulty
   */
  getTasksByDifficulty(difficulty: TaskDifficulty): AdminTask[] {
    return this.getActiveTasks().filter((t) => t.difficulty === difficulty);
  }

  /**
   * Get user progress on tasks
   */
  getUserTaskProgress(userId: string): {
    totalCompleted: number;
    totalEarned: number;
    completedTasks: UserTaskCompletion[];
    inProgressTasks: UserTaskCompletion[];
  } {
    const completions = this.getUserTaskCompletions(userId);
    const completed = completions.filter((c) => c.status === 'approved');
    const inProgress = completions.filter((c) => c.status === 'pending');

    return {
      totalCompleted: completed.length,
      totalEarned: completed.reduce((sum, c) => sum + c.pointsEarned, 0),
      completedTasks: completed,
      inProgressTasks: inProgress,
    };
  }

  /**
   * Get leaderboard - users with most task points
   */
  getLeaderboard(limit: number = 50): Array<{ userId: string; username: string; pointsEarned: number; tasksCompleted: number }> {
    const userStats: Map<string, { pointsEarned: number; tasksCompleted: number }> = new Map();

    for (const completions of this.taskCompletions.values()) {
      completions.forEach((completion) => {
        if (completion.status === 'approved') {
          if (!userStats.has(completion.userId)) {
            userStats.set(completion.userId, { pointsEarned: 0, tasksCompleted: 0 });
          }

          const stats = userStats.get(completion.userId)!;
          stats.pointsEarned += completion.pointsEarned;
          stats.tasksCompleted++;
        }
      });
    }

    const leaderboard = Array.from(this.userTaskHistory.entries())
      .map(([userId, completions]) => {
        const uniqueCompletions = new Set(completions.filter((c) => c.status === 'approved').map((c) => c.taskId)).size;
        const stats = userStats.get(userId);

        return {
          userId,
          username: completions[0]?.username || 'Unknown',
          pointsEarned: stats?.pointsEarned || 0,
          tasksCompleted: uniqueCompletions,
        };
      })
      .sort((a, b) => b.pointsEarned - a.pointsEarned)
      .slice(0, limit);

    return leaderboard;
  }

  /**
   * Get pending verifications (for manual verification tasks)
   */
  getPendingVerifications(): UserTaskCompletion[] {
    const pending: UserTaskCompletion[] = [];

    for (const completions of this.taskCompletions.values()) {
      pending.push(...completions.filter((c) => c.status === 'pending'));
    }

    return pending.sort((a, b) => (a.completedAt.getTime() > b.completedAt.getTime() ? 1 : -1));
  }

  /**
   * Export task data
   */
  exportTaskData(taskId: string): string {
    const task = this.tasks.get(taskId);
    if (!task) return '';

    const completions = this.taskCompletions.get(taskId) || [];
    const stats = this.getTaskStatistics(taskId);

    return JSON.stringify(
      {
        task,
        completions,
        statistics: stats,
      },
      null,
      2
    );
  }

  /**
   * Archive old completed tasks
   */
  archiveCompletedTasks(daysOld: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let archivedCount = 0;

    this.tasks.forEach((task) => {
      if (task.status === 'completed' && task.updatedAt < cutoffDate) {
        task.status = 'archived';
        archivedCount++;
      }
    });

    return archivedCount;
  }
}

// Singleton instance
export const adminTaskService = new AdminTaskService();
