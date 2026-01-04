import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  Gift,
  Link2,
  TrendingUp,
  Users,
  Award,
  Copy,
  CheckCircle,
  Share2,
  DollarSign,
} from 'lucide-react';
import { referralSystemService, REFERRAL_REWARD_POINTS, type UserReferralStats } from '@/lib/referral-system';

interface AdminReferralPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminReferralPanel: React.FC<AdminReferralPanelProps> = ({ isOpen, onClose }) => {
  const [allStats, setAllStats] = useState<UserReferralStats[]>([]);
  const [networkData, setNetworkData] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<UserReferralStats | null>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [awardPointsUserId, setAwardPointsUserId] = useState('');
  const [awardPointsAmount, setAwardPointsAmount] = useState('');
  const [awardPointsReason, setAwardPointsReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = () => {
    const stats = referralSystemService.adminGetAllReferralStats();
    setAllStats(stats);

    const network = referralSystemService.adminGetReferralNetwork();
    setNetworkData(network);
  };

  const handleSelectUser = (user: UserReferralStats) => {
    setSelectedUser(user);
    const details = referralSystemService.adminGetUserReferralDetails(user.userId);
    setUserDetails(details);
  };

  const handleAwardPoints = () => {
    if (!awardPointsUserId || !awardPointsAmount || !awardPointsReason) {
      alert('Please fill in all fields');
      return;
    }

    const points = parseInt(awardPointsAmount);
    if (isNaN(points) || points <= 0) {
      alert('Please enter a valid number of points');
      return;
    }

    try {
      referralSystemService.adminAwardPoints(awardPointsUserId, points, awardPointsReason, 'admin');
      alert(`Successfully awarded ${points} points to user ${awardPointsUserId}`);

      setAwardPointsUserId('');
      setAwardPointsAmount('');
      setAwardPointsReason('');

      loadData();
    } catch (error) {
      alert(`Error: ${error}`);
    }
  };

  const copyToClipboard = (text: string, code: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredStats = allStats.filter(
    (stat) =>
      stat.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stat.referralCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Gift className="w-6 h-6 text-green-500" />
            Referral System Management
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-gray-800 border-b border-gray-700">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="award">Award Points</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {networkData && (
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-gray-800 border-gray-700 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Users</p>
                      <p className="text-white text-2xl font-bold">{networkData.totalUsers}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-500" />
                  </div>
                </Card>

                <Card className="bg-gray-800 border-gray-700 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Active Referrers</p>
                      <p className="text-white text-2xl font-bold">{networkData.usersWithReferrals}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-500" />
                  </div>
                </Card>

                <Card className="bg-gray-800 border-gray-700 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Referrals</p>
                      <p className="text-white text-2xl font-bold">{networkData.totalReferrals}</p>
                    </div>
                    <Link2 className="w-8 h-8 text-purple-500" />
                  </div>
                </Card>

                <Card className="bg-gray-800 border-gray-700 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Points Awarded</p>
                      <p className="text-white text-2xl font-bold">{networkData.totalPointsAwarded}</p>
                    </div>
                    <Award className="w-8 h-8 text-yellow-500" />
                  </div>
                </Card>
              </div>
            )}

            {networkData?.topReferrers && networkData.topReferrers.length > 0 && (
              <Card className="bg-gray-800 border-gray-700 p-4">
                <h3 className="text-white font-semibold mb-4">Top 10 Referrers</h3>
                <div className="space-y-2">
                  {networkData.topReferrers.map((referrer: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">#{idx + 1}</Badge>
                        <span className="text-white font-mono text-sm">{referrer.userId}</span>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span className="text-gray-300">
                          <span className="text-green-400 font-semibold">{referrer.referralCount}</span> referrals
                        </span>
                        <span className="text-yellow-400 font-semibold">{referrer.pointsEarned} pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Input
              placeholder="Search by user ID or referral code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredStats.length === 0 ? (
                <Alert className="bg-gray-800 border-gray-700">
                  <AlertDescription className="text-gray-300">No users found</AlertDescription>
                </Alert>
              ) : (
                filteredStats.map((stat) => (
                  <Card
                    key={stat.userId}
                    className="bg-gray-800 border-gray-700 p-4 cursor-pointer hover:bg-gray-750 transition"
                    onClick={() => handleSelectUser(stat)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-semibold font-mono text-sm truncate">{stat.userId}</p>
                          {stat.joinedViaReferral && <Badge className="bg-green-600">Referred</Badge>}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                          <code className="bg-gray-900 px-2 py-1 rounded">{stat.referralCode}</code>
                          <span>•</span>
                          <span>{stat.totalReferred} referrals</span>
                          <span>•</span>
                          <span>{stat.totalPointsEarned} points</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectUser(stat);
                        }}
                        className="border-gray-600 text-gray-300"
                      >
                        View
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Award Points Tab */}
          <TabsContent value="award" className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-800">
                Manually award points to users. Each valid referral awards {REFERRAL_REWARD_POINTS} points automatically.
              </AlertDescription>
            </Alert>

            <Card className="bg-gray-800 border-gray-700 p-6 space-y-4">
              <div>
                <label className="text-sm text-gray-300 block mb-2">User ID</label>
                <Input
                  placeholder="Enter user ID"
                  value={awardPointsUserId}
                  onChange={(e) => setAwardPointsUserId(e.target.value)}
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>

              <div>
                <label className="text-sm text-gray-300 block mb-2">Points Amount</label>
                <Input
                  type="number"
                  placeholder="Enter points to award"
                  value={awardPointsAmount}
                  onChange={(e) => setAwardPointsAmount(e.target.value)}
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>

              <div>
                <label className="text-sm text-gray-300 block mb-2">Reason</label>
                <Input
                  placeholder="Reason for awarding points"
                  value={awardPointsReason}
                  onChange={(e) => setAwardPointsReason(e.target.value)}
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>

              <Button onClick={handleAwardPoints} className="w-full bg-green-600 hover:bg-green-700">
                <Gift className="w-4 h-4 mr-2" />
                Award Points
              </Button>
            </Card>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            {selectedUser && userDetails ? (
              <div className="space-y-4">
                <Card className="bg-gray-800 border-gray-700 p-4">
                  <h3 className="text-white font-semibold mb-3">User Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">User ID:</span>
                      <code className="bg-gray-900 px-2 py-1 rounded text-white">{selectedUser.userId}</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Referral Code:</span>
                      <div className="flex items-center gap-2">
                        <code className="bg-gray-900 px-2 py-1 rounded text-white">{selectedUser.referralCode}</code>
                        <button
                          onClick={() => copyToClipboard(selectedUser.referralCode, selectedUser.referralCode)}
                          className="text-gray-400 hover:text-white"
                        >
                          {copiedCode === selectedUser.referralCode ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Joined via Referral:</span>
                      <span className={selectedUser.joinedViaReferral ? 'text-green-400' : 'text-gray-400'}>
                        {selectedUser.joinedViaReferral ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </Card>

                <Card className="bg-gray-800 border-gray-700 p-4">
                  <h3 className="text-white font-semibold mb-3">Referral Statistics</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-700 p-2 rounded">
                      <p className="text-gray-400 text-xs">Total Referrals</p>
                      <p className="text-white text-2xl font-bold">{selectedUser.totalReferred}</p>
                    </div>
                    <div className="bg-gray-700 p-2 rounded">
                      <p className="text-gray-400 text-xs">Active Referrals</p>
                      <p className="text-white text-2xl font-bold">{selectedUser.activeReferrals}</p>
                    </div>
                    <div className="bg-gray-700 p-2 rounded">
                      <p className="text-gray-400 text-xs">Total Points</p>
                      <p className="text-yellow-400 text-2xl font-bold">{selectedUser.totalPointsEarned}</p>
                    </div>
                    <div className="bg-gray-700 p-2 rounded">
                      <p className="text-gray-400 text-xs">Points per Referral</p>
                      <p className="text-green-400 text-2xl font-bold">{REFERRAL_REWARD_POINTS}</p>
                    </div>
                  </div>
                </Card>

                {selectedUser.referredBy && (
                  <Card className="bg-gray-800 border-gray-700 p-4">
                    <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                      <Share2 className="w-4 h-4" />
                      Referred By
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Referrer ID:</span>
                        <code className="bg-gray-900 px-2 py-1 rounded text-white">{selectedUser.referredBy}</code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Referral Code Used:</span>
                        <code className="bg-gray-900 px-2 py-1 rounded text-white">{selectedUser.referredByCode}</code>
                      </div>
                    </div>
                  </Card>
                )}

                {userDetails.referrals && userDetails.referrals.length > 0 && (
                  <Card className="bg-gray-800 border-gray-700 p-4">
                    <h3 className="text-white font-semibold mb-3">Recent Referrals ({userDetails.referrals.length})</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {userDetails.referrals.slice(0, 10).map((ref: any, idx: number) => (
                        <div key={idx} className="p-2 bg-gray-700 rounded text-xs flex justify-between">
                          <span className="text-gray-300 font-mono">{ref.referredUserId.substring(0, 20)}...</span>
                          <span className="text-green-400">{ref.pointsAwarded} pts</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            ) : (
              <Alert className="bg-gray-800 border-gray-700">
                <AlertDescription className="text-gray-300">Select a user from the Users tab to view details</AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AdminReferralPanel;
