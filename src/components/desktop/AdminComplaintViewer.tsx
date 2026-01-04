import React, { useState } from 'react';
import { userMessagingService, type MessageStatus, type MessagePriority, type MessageType } from '../../lib/user-messaging';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface AdminComplaintViewerProps {
  adminId: string;
  adminName: string;
  onClose?: () => void;
}

const neonStyle = `
  .admin-neon-input {
    border-color: #ff00ff !important;
    color: #00ffff !important;
    background: rgba(0, 10, 40, 0.8) !important;
    box-shadow: 0 0 10px rgba(255, 0, 255, 0.3) !important;
    text-shadow: 0 0 10px rgba(0, 255, 255, 0.5) !important;
  }

  .admin-neon-input::placeholder {
    color: rgba(255, 0, 255, 0.5) !important;
  }

  .admin-neon-input:focus {
    box-shadow: 0 0 20px rgba(255, 0, 255, 0.6) !important;
    border-color: #00ffff !important;
  }

  .admin-neon-button {
    background: linear-gradient(135deg, #00ffff, #ff00ff) !important;
    color: #0a0e27 !important;
    border: 2px solid #00ffff !important;
    font-weight: bold !important;
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.5) !important;
    text-shadow: 0 0 5px rgba(0, 255, 255, 0.3) !important;
  }

  .admin-neon-button:hover {
    box-shadow: 0 0 30px rgba(0, 255, 255, 0.8) !important;
    transform: scale(1.02) !important;
  }

  .admin-neon-card {
    background: rgba(15, 21, 51, 0.8) !important;
    border: 2px solid #ff00ff !important;
    box-shadow: 0 0 20px rgba(255, 0, 255, 0.3) !important;
    backdrop-filter: blur(10px) !important;
  }

  .admin-neon-title {
    color: #ff00ff !important;
    text-shadow: 0 0 15px rgba(255, 0, 255, 0.6) !important;
    font-weight: bold !important;
  }

  .admin-neon-text {
    color: #00ffff !important;
    text-shadow: 0 0 10px rgba(0, 255, 255, 0.4) !important;
  }

  .complaint-item {
    background: rgba(10, 14, 40, 0.6) !important;
    border-left: 4px solid #ff00ff !important;
    box-shadow: inset 0 0 10px rgba(255, 0, 255, 0.1) !important;
    transition: all 0.3s ease !important;
    cursor: pointer !important;
  }

  .complaint-item:hover {
    border-left-color: #00ffff !important;
    background: rgba(15, 21, 51, 0.8) !important;
    box-shadow: inset 0 0 15px rgba(0, 255, 255, 0.1), 0 0 15px rgba(255, 0, 255, 0.2) !important;
  }

  .complaint-item.active {
    border-left-color: #00ffff !important;
    background: rgba(15, 21, 51, 0.9) !important;
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.3) !important;
  }

  .urgent-priority {
    border-left-color: #ff0000 !important;
    background: rgba(255, 0, 0, 0.1) !important;
  }

  .high-priority {
    border-left-color: #ffff00 !important;
    background: rgba(255, 255, 0, 0.05) !important;
  }
`;

export const AdminComplaintViewer: React.FC<AdminComplaintViewerProps> = ({ adminId, adminName, onClose }) => {
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [filterStatus, setFilterStatus] = useState<MessageStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<MessageType | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<MessagePriority | 'all'>('all');
  const [sending, setSending] = useState(false);

  const allMessages = userMessagingService.getAllMessages(
    filterStatus !== 'all' ? { status: filterStatus as MessageStatus } : undefined
  );

  const filteredMessages = allMessages
    .filter((m) => (filterType === 'all' ? true : m.type === filterType))
    .filter((m) => (filterPriority === 'all' ? true : m.priority === filterPriority));

  const selectedMessage = selectedMessageId ? userMessagingService.getMessage(selectedMessageId) : null;
  const conversation = selectedMessage ? userMessagingService.getConversationThread(selectedMessageId) : null;
  const stats = userMessagingService.getMessagingStatistics();

  const handleMarkStatus = (status: MessageStatus) => {
    if (selectedMessage) {
      userMessagingService.markAsRead(selectedMessage.id, adminId);
      if (status === 'in_progress') {
        userMessagingService.markAsInProgress(selectedMessage.id, adminId);
      } else if (status === 'resolved') {
        userMessagingService.markAsResolved(selectedMessage.id, adminId);
      } else if (status === 'closed') {
        userMessagingService.markAsClosed(selectedMessage.id, adminId);
      }
      setSelectedMessageId(null);
    }
  };

  const handleSendResponse = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMessage || !responseText.trim()) {
      alert('Please select a message and write a response');
      return;
    }

    setSending(true);

    try {
      const isResolution = selectedMessage.status !== 'closed';
      userMessagingService.addAdminResponse(
        selectedMessage.id,
        adminId,
        adminName,
        responseText,
        isResolution
      );

      setResponseText('');
      setSelectedMessageId(null);
    } catch (error) {
      console.error('Error sending response:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <style>{neonStyle}</style>

      <div className="w-full max-w-6xl mx-auto p-2 md:p-4">
        <Card className="admin-neon-card">
          <CardHeader>
            <CardTitle className="admin-neon-title">🎯 Admin Complaint Management</CardTitle>
            <CardDescription className="admin-neon-text">
              View and respond to user complaints, reviews, and feedback
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-6">
              <StatCard label="Total" value={stats.totalMessages} icon="📊" />
              <StatCard label="New" value={stats.newMessages} icon="🆕" color="cyan" />
              <StatCard label="In Progress" value={stats.inProgressMessages} icon="⏳" color="yellow" />
              <StatCard label="Resolved" value={stats.resolvedMessages} icon="✅" color="green" />
              <StatCard label="Avg Response" value={Math.round(stats.averageResponseTime) + ' min'} icon="⏱️" color="pink" />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Messages List */}
              <div className="lg:col-span-1">
                <div className="space-y-3">
                  {/* Filters */}
                  <div className="space-y-2">
                    <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                      <SelectTrigger className="admin-neon-input text-xs md:text-sm">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-2 border-pink-500/50">
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="new">🆕 New</SelectItem>
                        <SelectItem value="read">👁️ Read</SelectItem>
                        <SelectItem value="in_progress">⏳ In Progress</SelectItem>
                        <SelectItem value="resolved">✅ Resolved</SelectItem>
                        <SelectItem value="closed">🔒 Closed</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                      <SelectTrigger className="admin-neon-input text-xs md:text-sm">
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-2 border-pink-500/50">
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="complaint">⚠️ Complaint</SelectItem>
                        <SelectItem value="review">⭐ Review</SelectItem>
                        <SelectItem value="bug_report">🐛 Bug Report</SelectItem>
                        <SelectItem value="feature_request">💡 Feature Request</SelectItem>
                        <SelectItem value="general">💬 General</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filterPriority} onValueChange={(v: any) => setFilterPriority(v)}>
                      <SelectTrigger className="admin-neon-input text-xs md:text-sm">
                        <SelectValue placeholder="Filter by priority" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-2 border-pink-500/50">
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="low">🟢 Low</SelectItem>
                        <SelectItem value="medium">🟡 Medium</SelectItem>
                        <SelectItem value="high">🔴 High</SelectItem>
                        <SelectItem value="urgent">⛔ Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Messages */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredMessages.length === 0 ? (
                      <p className="admin-neon-text text-center py-4 text-xs md:text-sm">No messages found</p>
                    ) : (
                      filteredMessages.map((msg) => (
                        <div
                          key={msg.id}
                          onClick={() => setSelectedMessageId(msg.id)}
                          className={`complaint-item p-2 md:p-3 rounded cursor-pointer transition-all ${
                            selectedMessageId === msg.id ? 'active' : ''
                          } ${msg.priority === 'urgent' ? 'urgent-priority' : msg.priority === 'high' ? 'high-priority' : ''}`}
                        >
                          <div className="admin-neon-title text-xs md:text-sm font-bold truncate">{msg.subject}</div>
                          <div className="admin-neon-text text-xs mt-1 line-clamp-1">{msg.username}</div>
                          <div className="flex gap-1 mt-2 flex-wrap">
                            <Badge className="text-xs bg-cyan-500/20 text-cyan-300 font-bold">
                              {getTypeEmoji(msg.type)} {msg.type}
                            </Badge>
                            <Badge className="text-xs bg-pink-500/20 text-pink-300 font-bold">
                              {msg.priority}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Message Detail & Response */}
              <div className="lg:col-span-2">
                {selectedMessage && conversation ? (
                  <div className="space-y-4">
                    {/* Message Detail */}
                    <Card className="admin-neon-card">
                      <CardHeader>
                        <CardTitle className="admin-neon-title text-sm md:text-base">{selectedMessage.subject}</CardTitle>
                        <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
                          <span className="admin-neon-text text-xs md:text-sm">From: {selectedMessage.username}</span>
                          <Badge className={`text-xs font-bold ${getStatusColor(selectedMessage.status)}`}>
                            {getStatusEmoji(selectedMessage.status)} {selectedMessage.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="admin-neon-text text-xs md:text-sm">{selectedMessage.message}</p>
                        <div className="text-xs admin-neon-text opacity-70">
                          📅 {new Date(selectedMessage.createdAt).toLocaleString()}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            onClick={() => handleMarkStatus('in_progress')}
                            className="admin-neon-button text-xs md:text-sm flex-1 min-w-max"
                            disabled={selectedMessage.status === 'in_progress'}
                          >
                            ⏳ In Progress
                          </Button>
                          <Button
                            onClick={() => handleMarkStatus('resolved')}
                            className="admin-neon-button text-xs md:text-sm flex-1 min-w-max"
                            disabled={selectedMessage.status === 'resolved'}
                          >
                            ✅ Resolve
                          </Button>
                          <Button
                            onClick={() => handleMarkStatus('closed')}
                            className="admin-neon-button text-xs md:text-sm flex-1 min-w-max"
                            disabled={selectedMessage.status === 'closed'}
                          >
                            🔒 Close
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Responses */}
                    {conversation.adminResponses.length > 0 && (
                      <Card className="admin-neon-card">
                        <CardHeader>
                          <CardTitle className="admin-neon-title text-sm md:text-base">
                            💬 Admin Responses ({conversation.adminResponses.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {conversation.adminResponses.map((response) => (
                            <div key={response.id} className="p-3 bg-cyan-500/10 border-l-4 border-cyan-400 rounded">
                              <div className="admin-neon-title text-xs md:text-sm font-bold">{response.adminName}</div>
                              <p className="admin-neon-text text-xs md:text-sm mt-2">{response.response}</p>
                              <div className="text-xs admin-neon-text opacity-70 mt-2">
                                {new Date(response.createdAt).toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Send Response Form */}
                    <form onSubmit={handleSendResponse} className="space-y-3">
                      <Textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Type your response here..."
                        className="admin-neon-input text-xs md:text-sm min-h-24"
                        disabled={sending}
                      />
                      <Button className="admin-neon-button w-full text-xs md:text-sm" disabled={sending} type="submit">
                        {sending ? '⏳ Sending...' : '🚀 Send Response'}
                      </Button>
                    </form>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="admin-neon-text text-center">Select a message to view details</p>
                  </div>
                )}
              </div>
            </div>

            {/* Close Button */}
            {onClose && (
              <div className="mt-6">
                <Button variant="outline" className="admin-neon-button w-full text-xs md:text-sm" onClick={onClose}>
                  ✕ Close Complaint Manager
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

function StatCard({
  label,
  value,
  icon,
  color = 'pink',
}: {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
}): JSX.Element {
  const colorClasses: Record<string, string> = {
    cyan: 'border-cyan-500/50 bg-cyan-500/10',
    pink: 'border-pink-500/50 bg-pink-500/10',
    yellow: 'border-yellow-500/50 bg-yellow-500/10',
    green: 'border-green-500/50 bg-green-500/10',
  };

  return (
    <div className={`border-2 rounded p-2 text-center ${colorClasses[color] || colorClasses.pink}`}>
      <div className="text-xl md:text-2xl">{icon}</div>
      <div className="text-xs font-bold text-gray-400 mt-1">{label}</div>
      <div className="admin-neon-text text-sm md:text-base font-bold">{value}</div>
    </div>
  );
}

function getTypeEmoji(type: string): string {
  const emojis: Record<string, string> = {
    complaint: '⚠️',
    review: '⭐',
    bug_report: '🐛',
    feature_request: '💡',
    general: '💬',
  };
  return emojis[type] || '💬';
}

function getStatusEmoji(status: string): string {
  const emojis: Record<string, string> = {
    new: '🆕',
    read: '👁️',
    in_progress: '⏳',
    resolved: '✅',
    closed: '🔒',
  };
  return emojis[status] || '📦';
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    new: 'bg-cyan-500/20 text-cyan-300',
    read: 'bg-blue-500/20 text-blue-300',
    in_progress: 'bg-yellow-500/20 text-yellow-300',
    resolved: 'bg-green-500/20 text-green-300',
    closed: 'bg-gray-500/20 text-gray-300',
  };
  return colors[status] || 'bg-gray-500/20 text-gray-300';
}
