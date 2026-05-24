'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  User,
  Building2,
  Sun,
  Moon,
  Monitor,
  Bell,
  Download,
  Trash2,
  Shield,
  LogOut,
  Check,
  Loader2,
  Mail,
  Key,
  Upload,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export function SettingsView() {
  const {
    user,
    logout,
    updateProfile,
    changePassword,
    deleteAccount,
    sendVerificationEmail,
  } = useAuth()
  const { theme, setTheme } = useTheme()
  // Profile state — use user?.name as key to reset form when user changes
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Password change state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordChanging, setPasswordChanging] = useState(false)
  const [passwordChanged, setPasswordChanged] = useState(false)

  // Notification settings (stored locally for now, could be persisted)
  const [notifications, setNotifications] = useState({
    fraud: true,
    budget: true,
    weekly: false,
  })

  // Delete account state
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Verification email state
  const [verificationSent, setVerificationSent] = useState(false)
  const [verificationSending, setVerificationSending] = useState(false)

  // Derive mounted state using callback pattern to avoid lint warning
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id) }, [])

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    setSaving(true)
    setSaved(false)
    const result = await updateProfile({ name: name.trim(), company: company.trim() })
    setSaving(false)
    if (result.success) {
      setSaved(true)
      toast.success('Profile updated successfully')
      setTimeout(() => setSaved(false), 2000)
    } else {
      toast.error(result.error || 'Failed to update profile')
    }
  }

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setPasswordChanging(true)
    setPasswordChanged(false)
    const result = await changePassword(newPassword)
    setPasswordChanging(false)
    if (result.success) {
      setPasswordChanged(true)
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password changed successfully')
      setTimeout(() => setPasswordChanged(false), 3000)
    } else {
      toast.error(result.error || 'Failed to change password')
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return
    setDeleting(true)
    const result = await deleteAccount()
    setDeleting(false)
    if (result.success) {
      toast.success('Account deleted successfully')
      setDeleteOpen(false)
      // logout is called within deleteAccount
    } else {
      toast.error(result.error || 'Failed to delete account')
    }
  }

  const handleExportData = async () => {
    try {
      const res = await fetch('/api/invoices')
      if (res.ok) {
        const data = await res.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'invoiceiq-data-export.json'
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Data exported successfully')
      }
    } catch {
      toast.error('Failed to export data')
    }
  }

  const handleSendVerification = async () => {
    setVerificationSending(true)
    const result = await sendVerificationEmail()
    setVerificationSending(false)
    if (result.success) {
      setVerificationSent(true)
      toast.success('Verification email sent! Check your inbox.')
    } else {
      toast.error(result.error || 'Failed to send verification email')
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Profile Settings */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-purple-500" />
            Profile Settings
          </CardTitle>
          <CardDescription>Manage your profile information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.avatar} alt={user?.name} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-purple-700 text-white text-lg font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{user?.name || 'User'}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={user?.emailVerified ? 'default' : 'secondary'} className="text-xs">
                  {user?.emailVerified ? (
                    <><CheckCircle2 className="h-3 w-3 mr-1" /> Verified</>
                  ) : (
                    <><AlertCircle className="h-3 w-3 mr-1" /> Unverified</>
                  )}
                </Badge>
                {!user?.emailVerified && !verificationSent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-purple-500 hover:text-purple-600"
                    onClick={handleSendVerification}
                    disabled={verificationSending}
                  >
                    {verificationSending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Mail className="h-3 w-3 mr-1" />}
                    Verify Email
                  </Button>
                )}
                {verificationSent && (
                  <span className="text-xs text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Email sent
                  </span>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="settings-name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="settings-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 rounded-xl"
                  placeholder="Your name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-email">Email</Label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="settings-email"
                  value={user?.email || ''}
                  className="pl-10 rounded-xl bg-gray-50 dark:bg-gray-800/50"
                  disabled
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Email is managed by your auth provider</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-company">Company</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="settings-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="pl-10 rounded-xl"
                placeholder="Your company (optional)"
              />
            </div>
          </div>
          <Button onClick={handleSaveProfile} disabled={saving} className="rounded-xl">
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</>
            ) : saved ? (
              <><Check className="h-4 w-4 mr-2" /> Saved!</>
            ) : (
              'Save Changes'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Key className="h-5 w-5 text-purple-500" />
            Security
          </CardTitle>
          <CardDescription>Manage your password and security preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-xl"
              placeholder="Enter new password"
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-xl"
              placeholder="Confirm new password"
            />
          </div>
          {passwordChanged && (
            <p className="text-sm text-emerald-500 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Password changed successfully
            </p>
          )}
          <Button
            onClick={handleChangePassword}
            disabled={passwordChanging || !newPassword || !confirmPassword}
            variant="outline"
            className="rounded-xl"
          >
            {passwordChanging ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Changing...</>
            ) : (
              <><Key className="h-4 w-4 mr-2" /> Change Password</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      {mounted && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sun className="h-5 w-5 text-purple-500" />
              Appearance
            </CardTitle>
            <CardDescription>Customize the look and feel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light', icon: Sun, label: 'Light' },
                { id: 'dark', icon: Moon, label: 'Dark' },
                { id: 'system', icon: Monitor, label: 'System' },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setTheme(option.id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    theme === option.id
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-transparent bg-secondary/50 hover:bg-secondary'
                  }`}
                >
                  <option.icon className={`h-5 w-5 ${theme === option.id ? 'text-purple-500' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${theme === option.id ? 'text-purple-600 dark:text-purple-400' : 'text-muted-foreground'}`}>
                    {option.label}
                  </span>
                  {theme === option.id && <Badge className="text-[10px]">Active</Badge>}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification Settings */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-purple-500" />
            Notifications
          </CardTitle>
          <CardDescription>Choose what notifications you receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'fraud' as const, label: 'Fraud Alerts', desc: 'Get notified when suspicious invoices are detected' },
            { key: 'budget' as const, label: 'Budget Warnings', desc: 'Alert when spending exceeds budget thresholds' },
            { key: 'weekly' as const, label: 'Weekly Summary', desc: 'Receive a weekly spending summary email' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                checked={notifications[item.key]}
                onCheckedChange={(checked) => setNotifications({ ...notifications, [item.key]: checked })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Data & Account */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Download className="h-5 w-5 text-purple-500" />
            Data & Account
          </CardTitle>
          <CardDescription>Export or manage your account data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Export Data</p>
              <p className="text-xs text-muted-foreground">Download all your invoices and data as JSON</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={handleExportData}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Sign Out</p>
              <p className="text-xs text-muted-foreground">Sign out of your account</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={logout}>
              <LogOut className="h-4 w-4 mr-1" /> Sign Out
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-500">Delete Account</p>
              <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={() => { setDeleteOpen(true); setDeleteConfirm('') }}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-500">Delete Account</DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone. All your data, invoices,
              chat history, and settings will be permanently deleted from Firebase.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Type <strong>DELETE</strong> to confirm:
            </p>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Type DELETE here"
              className="rounded-xl"
            />
            <Button
              onClick={handleDeleteAccount}
              className="w-full bg-red-500 hover:bg-red-600 text-white rounded-xl"
              disabled={deleteConfirm !== 'DELETE' || deleting}
            >
              {deleting ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Deleting...</>
              ) : (
                'Permanently Delete Account'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
