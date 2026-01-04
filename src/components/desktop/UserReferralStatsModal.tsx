import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Gift,
  Copy,
  CheckCircle,
  Share2,
  TrendingUp,
  Users,
  Award,
  LinkIcon,
  AlertCircle,
} from 'lucide-react';
import { referralSystemService, REFERRAL_REWARD_POINTS, type UserReferralStats } from '@/lib/referral-system';

interface UserReferralStatsModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const UserReferralStatsModal: React.FC<UserReferralStatsModalProps> = ({ userId, isOpen, onClose }) => {
  const [stats, setStats] = useState<UserReferralStats | null>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [referrer, setReferrer] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      loadStats();
    }
  }, [isOpen, userId]);

  const loadStats = () => {
    setLoading(true);
    try {
      const userStats = referralSystemService.getUserReferralStats(userId);
      setStats(userStats);

      const userReferrals = referralSystemService.getUserReferrals(userId);
      setReferrals(userReferrals);

      const userReferrer = referralSystemService.getUserReferrer(userId);
      setReferrer(userReferrer);
    } catch (error) {
      console.error('Error loading referral stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (stats?.referralCode) {
      navigator.clipboard.writeText(stats.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareCode = () => {
    if (stats?.referralCode) {
      const text = `Join me! Use referral code: ${stats.referralCode}\nYou'll earn ${REFERRAL_REWARD_POINTS} bonus points! 🎉`;
      if (navigator.share) {
        navigator.share({
          title: 'Join Us!',
          text: text,
        });
      } else {
        navigator.clipboard.writeText(text);
        alert('Referral code copied to clipboard!');
      }
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <p className="text-gray-300">Loading referral stats...</p>
        </DialogContent>
      </Dialog>
    );
  }

  if (!stats) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">No referral stats found</AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Gift className="w-6 h-6 text-green-500" />
            Referral Stats
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-gray-800 border-b border-gray-700">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="referrals">Referrals ({referrals.length})</TabsTrigger>
            {referrer && <TabsTrigger value="referrer">Referrer</TabsTrigger>}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Referral Code Card */}
            <Card className="bg-gradient-to-r from-green-900 to-emerald-900 border-green-700 p-6">
              <p className="text-green-200 text-sm mb-2">Your Referral Code</p>
              <div className="flex items-center gap-3 bg-black bg-opacity-30 p-4 rounded-lg">
                <code className="flex-1 text-white font-mono text-2xl tracking-widest text-center">
                  {stats.referralCode}
                </code>
                <button
                  onClick={handleCopyCode}
                  className="text-green-300 hover:text-green-100 transition"
                  title="Copy code"
                >
                  {copied ? (
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  ) : (
                    <Copy className="w-6 h-6" />
                  )}
                </button>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  onClick={handleShareCode}
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gray-800 border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs">Total Referrals</p>
                    <p className="text-white text-3xl font-bold">{stats.totalReferred}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500 opacity-50" />
                </div>
              </Card>

              <Card className="bg-gray-800 border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs">Active Referrals</p>
                    <p className="text-white text-3xl font-bold">{stats.activeReferrals}</p>
                  </div>
                  <LinkIcon className="w-8 h-8 text-purple-500 opacity-50" />
                </div>
              </Card>

              <Card className="bg-gray-800 border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs">Total Points Earned</p>
                    <p className="text-yellow-400 text-3xl font-bold">{stats.totalPointsEarned}</p>
                  </div>
                  <Award className="w-8 h-8 text-yellow-500 opacity-50" />
                </div>
              </Card>

              <Card className="bg-gray-800 border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs">Points per Referral</p>
                    <p className="text-green-400 text-3xl font-bold">{REFERRAL_REWARD_POINTS}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500 opacity-50" />
                </div>
              </Card>
            </div>

            {/* Info Alert */}
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-800 text-sm">
                Each friend who signs up with your referral code earns you{' '}
                <strong>{REFERRAL_REWARD_POINTS} points</strong>. Share your code to earn more!
              </AlertDescription>
            </Alert>

            {/* Joined Via Referral */}
            {stats.joinedViaReferral && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 text-sm">
                  You joined via a referral! Thank you for being part of our community.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals" className="space-y-4">
            {referrals.length === 0 ? (
              <Alert className="bg-gray-800 border-gray-700">
                <AlertDescription className="text-gray-300">
                  You haven't referred anyone yet. Share your code to get started!
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                {referrals.map((referral, idx) => (
                  <Card key={idx} className="bg-gray-800 border-gray-700 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-mono text-sm truncate">{referral.referredUserId}</p>
                        <p className="text-gray-400 text-xs mt-1">
                          {new Date(referral.referredAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          className={
                            referral.status === 'active'
                              ? 'bg-green-600'
                              : referral.status === 'pending'
                                ? 'bg-yellow-600'
                                : 'bg-gray-600'
                          }
                        >
                          {referral.status}
                        </Badge>
                        <p className="text-green-400 font-semibold text-sm mt-1">+{referral.pointsAwarded} pts</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Referrer Tab */}
          {referrer && (
            <TabsContent value="referrer" className="space-y-4">
              <Card className="bg-gray-800 border-gray-700 p-4">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Referred By
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-400 text-sm">Referrer ID</p>
                    <p className="text-white font-mono mt-1">{referrer.referrerId}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Referral Code Used</p>
                    <code className="bg-gray-900 text-white px-3 py-1 rounded text-sm block mt-1">
                      {referrer.referralCode}
                    </code>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Joined Date</p>
                    <p className="text-white mt-1">{new Date(referrer.referredAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Status</p>
                    <Badge className="mt-1 bg-green-600">{referrer.status}</Badge>
                  </div>
                </div>
              </Card>

              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-800 text-sm">
                  Thank you for joining via referral! Your referrer earned points when you signed up.
                </AlertDescription>
              </Alert>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default UserReferralStatsModal;
