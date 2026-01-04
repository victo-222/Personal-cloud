// AI Personalization Service
// Provides AI-driven recommendations and automated task scheduling

export interface UserBehavior {
  userId: string;
  fileAccessPattern: Map<string, number>; // filename -> access count
  toolUsageFrequency: Map<string, number>; // tool name -> usage count
  timeOfDayPatterns: Map<string, number>; // hour -> usage count
  lastActivity: Date;
  totalSessions: number;
}

export interface AIRecommendation {
  id: string;
  userId: string;
  type: 'file' | 'tool' | 'workflow' | 'task';
  title: string;
  description: string;
  reason: string; // Why this is recommended
  priority: 'high' | 'medium' | 'low';
  confidence: number; // 0-1 score
  recommendedAt: Date;
  expiresAt: Date;
  actionUrl?: string;
}

export interface ScheduledTask {
  id: string;
  userId: string;
  title: string;
  description?: string;
  type: 'reminder' | 'followup' | 'recurring' | 'oneoff';
  priority: 'high' | 'medium' | 'low';
  scheduledFor: Date;
  recurrence?: 'daily' | 'weekly' | 'monthly';
  status: 'pending' | 'completed' | 'cancelled';
  autoScheduled: boolean; // Whether AI scheduled this
  reasonForScheduling?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface UserProfile {
  userId: string;
  behavior: UserBehavior;
  preferences: {
    maxRecommendationsPerDay: number;
    recommendedTools: string[];
    frequentWorkflows: string[];
    preferredTaskTime: string; // HH:MM
  };
}

export class AIPersonalizationService {
  private userProfiles: Map<string, UserProfile> = new Map();
  private recommendations: Map<string, AIRecommendation[]> = new Map();
  private scheduledTasks: Map<string, ScheduledTask[]> = new Map();

  constructor() {
    // Initialize service
  }

  // ============================================
  // USER BEHAVIOR TRACKING
  // ============================================

  /**
   * Initialize user profile
   */
  initializeUserProfile(userId: string): UserProfile {
    if (this.userProfiles.has(userId)) {
      return this.userProfiles.get(userId)!;
    }

    const profile: UserProfile = {
      userId,
      behavior: {
        userId,
        fileAccessPattern: new Map(),
        toolUsageFrequency: new Map(),
        timeOfDayPatterns: new Map(),
        lastActivity: new Date(),
        totalSessions: 0,
      },
      preferences: {
        maxRecommendationsPerDay: 5,
        recommendedTools: [],
        frequentWorkflows: [],
        preferredTaskTime: '09:00',
      },
    };

    this.userProfiles.set(userId, profile);
    this.recommendations.set(userId, []);
    this.scheduledTasks.set(userId, []);

    return profile;
  }

  /**
   * Track file access
   */
  trackFileAccess(userId: string, fileName: string): void {
    const profile = this.initializeUserProfile(userId);
    const count = profile.behavior.fileAccessPattern.get(fileName) || 0;
    profile.behavior.fileAccessPattern.set(fileName, count + 1);
    profile.behavior.lastActivity = new Date();
  }

  /**
   * Track tool usage
   */
  trackToolUsage(userId: string, toolName: string): void {
    const profile = this.initializeUserProfile(userId);
    const count = profile.behavior.toolUsageFrequency.get(toolName) || 0;
    profile.behavior.toolUsageFrequency.set(toolName, count + 1);
    profile.behavior.lastActivity = new Date();
  }

  /**
   * Track session
   */
  trackSessionStart(userId: string): void {
    const profile = this.initializeUserProfile(userId);
    profile.behavior.totalSessions += 1;
    profile.behavior.lastActivity = new Date();

    const hour = new Date().getHours().toString();
    const count = profile.behavior.timeOfDayPatterns.get(hour) || 0;
    profile.behavior.timeOfDayPatterns.set(hour, count + 1);
  }

  /**
   * Get user behavior
   */
  getUserBehavior(userId: string): UserBehavior | null {
    const profile = this.userProfiles.get(userId);
    return profile?.behavior || null;
  }

  // ============================================
  // RECOMMENDATIONS ENGINE
  // ============================================

  /**
   * Generate file recommendations
   */
  generateFileRecommendations(userId: string): AIRecommendation[] {
    const profile = this.initializeUserProfile(userId);
    const recommendations: AIRecommendation[] = [];

    // Get top 5 most accessed files
    const sortedFiles = Array.from(profile.behavior.fileAccessPattern.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    sortedFiles.forEach(([fileName, accessCount], index) => {
      const recommendation: AIRecommendation = {
        id: `rec-file-${userId}-${Date.now()}-${index}`,
        userId,
        type: 'file',
        title: `Quick Access: ${fileName}`,
        description: `You've accessed this file ${accessCount} times recently.`,
        reason: 'Based on your file access patterns',
        priority: accessCount > 10 ? 'high' : accessCount > 5 ? 'medium' : 'low',
        confidence: Math.min(accessCount / 20, 1), // Max 1.0
        recommendedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        actionUrl: `/files/${fileName}`,
      };

      recommendations.push(recommendation);
    });

    return recommendations;
  }

  /**
   * Generate tool recommendations
   */
  generateToolRecommendations(userId: string): AIRecommendation[] {
    const profile = this.initializeUserProfile(userId);
    const recommendations: AIRecommendation[] = [];

    // Get top 5 most used tools
    const sortedTools = Array.from(profile.behavior.toolUsageFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    sortedTools.forEach(([toolName, usageCount], index) => {
      const recommendation: AIRecommendation = {
        id: `rec-tool-${userId}-${Date.now()}-${index}`,
        userId,
        type: 'tool',
        title: `Frequently Used: ${toolName}`,
        description: `You use this tool regularly - ${usageCount} times this month.`,
        reason: 'Based on your tool usage patterns',
        priority: usageCount > 20 ? 'high' : usageCount > 10 ? 'medium' : 'low',
        confidence: Math.min(usageCount / 30, 1),
        recommendedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        actionUrl: `/tools/${toolName}`,
      };

      recommendations.push(recommendation);
    });

    return recommendations;
  }

  /**
   * Generate workflow recommendations
   */
  generateWorkflowRecommendations(userId: string): AIRecommendation[] {
    const profile = this.initializeUserProfile(userId);
    const recommendations: AIRecommendation[] = [];

    // Analyze tool usage patterns to suggest workflows
    if (profile.behavior.toolUsageFrequency.size >= 2) {
      const sortedTools = Array.from(profile.behavior.toolUsageFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      const toolNames = sortedTools.map(([name]) => name);
      const workflowName = `${toolNames.join(' → ')} Workflow`;

      const recommendation: AIRecommendation = {
        id: `rec-workflow-${userId}-${Date.now()}`,
        userId,
        type: 'workflow',
        title: `Suggested Workflow: ${workflowName}`,
        description: `Based on your frequent tool usage, this workflow might streamline your tasks.`,
        reason: 'Detected pattern in your tool usage sequence',
        priority: 'medium',
        confidence: 0.75,
        recommendedAt: new Date(),
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      };

      recommendations.push(recommendation);
    }

    return recommendations;
  }

  /**
   * Get all AI recommendations for user
   */
  getAllRecommendations(userId: string): AIRecommendation[] {
    const profile = this.initializeUserProfile(userId);
    const maxRecs = profile.preferences.maxRecommendationsPerDay;

    const fileRecs = this.generateFileRecommendations(userId);
    const toolRecs = this.generateToolRecommendations(userId);
    const workflowRecs = this.generateWorkflowRecommendations(userId);

    // Combine and sort by priority and confidence
    const allRecs = [...fileRecs, ...toolRecs, ...workflowRecs]
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.confidence - a.confidence;
      })
      .slice(0, maxRecs);

    this.recommendations.set(userId, allRecs);
    return allRecs;
  }

  /**
   * Get current recommendations
   */
  getRecommendations(userId: string): AIRecommendation[] {
    const recs = this.recommendations.get(userId) || [];
    // Filter out expired recommendations
    return recs.filter((rec) => rec.expiresAt > new Date());
  }

  // ============================================
  // TASK SCHEDULING
  // ============================================

  /**
   * Create scheduled task
   */
  createScheduledTask(
    userId: string,
    title: string,
    scheduledFor: Date,
    options: Partial<ScheduledTask> = {}
  ): ScheduledTask {
    const task: ScheduledTask = {
      id: `task-${userId}-${Date.now()}`,
      userId,
      title,
      scheduledFor,
      status: 'pending',
      autoScheduled: false,
      createdAt: new Date(),
      ...options,
    };

    const userTasks = this.scheduledTasks.get(userId) || [];
    userTasks.push(task);
    this.scheduledTasks.set(userId, userTasks);

    return task;
  }

  /**
   * Auto-schedule tasks based on user behavior
   */
  autoScheduleTasks(userId: string): ScheduledTask[] {
    const profile = this.initializeUserProfile(userId);
    const scheduledTasks: ScheduledTask[] = [];

    // Analyze activity patterns and schedule appropriate tasks
    const peakHours = this.getActivityPeakHours(userId);

    if (peakHours.length > 0) {
      const preferredHour = peakHours[0];

      // Schedule daily standup reminder
      const standupTime = new Date();
      standupTime.setHours(parseInt(preferredHour), 0, 0);

      if (standupTime < new Date()) {
        standupTime.setDate(standupTime.getDate() + 1);
      }

      const standupTask = this.createScheduledTask(userId, 'Daily Standup', standupTime, {
        type: 'recurring',
        recurrence: 'daily',
        priority: 'high',
        autoScheduled: true,
        reasonForScheduling: `Scheduled during your peak activity hour (${preferredHour}:00)`,
      });

      scheduledTasks.push(standupTask);
    }

    // Schedule weekly review
    const nextMonday = new Date();
    const currentDay = nextMonday.getDay();
    const daysUntilMonday = (1 + 7 - currentDay) % 7;
    nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
    nextMonday.setHours(10, 0, 0);

    const reviewTask = this.createScheduledTask(userId, 'Weekly Review', nextMonday, {
      type: 'recurring',
      recurrence: 'weekly',
      priority: 'medium',
      autoScheduled: true,
      reasonForScheduling: 'Suggested weekly review to track progress',
    });

    scheduledTasks.push(reviewTask);

    return scheduledTasks;
  }

  /**
   * Get activity peak hours
   */
  private getActivityPeakHours(userId: string): string[] {
    const profile = this.initializeUserProfile(userId);
    const sortedHours = Array.from(profile.behavior.timeOfDayPatterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => hour);

    return sortedHours;
  }

  /**
   * Get scheduled tasks for user
   */
  getScheduledTasks(userId: string, filter?: 'pending' | 'completed' | 'all'): ScheduledTask[] {
    const tasks = this.scheduledTasks.get(userId) || [];

    if (filter === 'all') return tasks;
    return tasks.filter((task) => task.status === (filter || 'pending'));
  }

  /**
   * Mark task as completed
   */
  completeTask(userId: string, taskId: string): ScheduledTask | null {
    const tasks = this.scheduledTasks.get(userId);
    if (!tasks) return null;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return null;

    task.status = 'completed';
    task.completedAt = new Date();

    return task;
  }

  /**
   * Cancel scheduled task
   */
  cancelTask(userId: string, taskId: string): ScheduledTask | null {
    const tasks = this.scheduledTasks.get(userId);
    if (!tasks) return null;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return null;

    task.status = 'cancelled';
    return task;
  }

  /**
   * Get upcoming tasks
   */
  getUpcomingTasks(userId: string, daysAhead: number = 7): ScheduledTask[] {
    const tasks = this.getScheduledTasks(userId, 'pending');
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    return tasks.filter((task) => task.scheduledFor >= now && task.scheduledFor <= futureDate);
  }

  // ============================================
  // INSIGHTS & ANALYTICS
  // ============================================

  /**
   * Get user insights summary
   */
  getUserInsights(userId: string): {
    mostUsedTool: string | null;
    mostAccessedFile: string | null;
    peakActivityHour: string | null;
    totalToolsUsed: number;
    averageSessionsPerDay: number;
    recommendationCount: number;
    pendingTaskCount: number;
  } {
    const profile = this.initializeUserProfile(userId);
    const behavior = profile.behavior;

    const mostUsedToolEntry = Array.from(behavior.toolUsageFrequency.entries()).sort((a, b) => b[1] - a[1])[0];
    const mostAccessedFileEntry = Array.from(behavior.fileAccessPattern.entries()).sort((a, b) => b[1] - a[1])[0];
    const peakHourEntry = Array.from(behavior.timeOfDayPatterns.entries()).sort((a, b) => b[1] - a[1])[0];

    const recommendations = this.getRecommendations(userId);
    const pendingTasks = this.getScheduledTasks(userId, 'pending');

    const daysSinceStart = Math.max(1, Math.floor((new Date().getTime() - behavior.lastActivity.getTime()) / (24 * 60 * 60 * 1000)));

    return {
      mostUsedTool: mostUsedToolEntry ? mostUsedToolEntry[0] : null,
      mostAccessedFile: mostAccessedFileEntry ? mostAccessedFileEntry[0] : null,
      peakActivityHour: peakHourEntry ? `${peakHourEntry[0]}:00` : null,
      totalToolsUsed: behavior.toolUsageFrequency.size,
      averageSessionsPerDay: Math.round(behavior.totalSessions / daysSinceStart),
      recommendationCount: recommendations.length,
      pendingTaskCount: pendingTasks.length,
    };
  }

  /**
   * Export user insights to JSON
   */
  exportUserInsights(userId: string): string {
    const profile = this.userProfiles.get(userId);
    const insights = this.getUserInsights(userId);
    const recommendations = this.getRecommendations(userId);
    const tasks = this.getScheduledTasks(userId);

    const exportData = {
      userId,
      insights,
      recommendations,
      tasks,
      exportedAt: new Date(),
    };

    return JSON.stringify(exportData, null, 2);
  }
}

// Singleton instance
export const aiPersonalizationService = new AIPersonalizationService();
