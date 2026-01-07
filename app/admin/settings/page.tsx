'use client';

import { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, Mail, CreditCard, Bell, Settings as SettingsIcon } from 'lucide-react';

interface Setting {
  key: string;
  value: string;
  category: string;
  isEncrypted: boolean;
  description?: string;
}

interface SettingsGroup {
  [key: string]: string;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('email');
  const [showSecrets, setShowSecrets] = useState<{ [key: string]: boolean }>({});
  
  const [emailSettings, setEmailSettings] = useState({
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_password: '',
    email_from: '',
  });

  const [stripeSettings, setStripeSettings] = useState({
    stripe_secret_key: '',
    stripe_publishable_key: '',
    stripe_webhook_secret: '',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    order_confirmation_enabled: 'true',
    order_shipped_enabled: 'true',
    order_delivered_enabled: 'true',
    abandoned_cart_enabled: 'true',
    abandoned_cart_delay_hours: '1',
    abandoned_cart_reminder_2_hours: '24',
    abandoned_cart_reminder_3_hours: '72',
    low_stock_alert_enabled: 'true',
    low_stock_threshold: '10',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      
      if (data.settings) {
        const grouped = groupSettings(data.settings);
        setEmailSettings(prev => ({ ...prev, ...grouped.email }));
        setStripeSettings(prev => ({ ...prev, ...grouped.stripe }));
        setNotificationSettings(prev => ({ ...prev, ...grouped.notification }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupSettings = (settings: Setting[]): { [key: string]: SettingsGroup } => {
    const grouped: { [key: string]: SettingsGroup } = {
      email: {},
      stripe: {},
      notification: {},
    };

    settings.forEach(setting => {
      if (grouped[setting.category]) {
        grouped[setting.category][setting.key] = setting.value;
      }
    });

    return grouped;
  };

  const handleSave = async (category: string) => {
    setSaving(true);
    try {
      let settings;
      if (category === 'email') settings = emailSettings;
      else if (category === 'stripe') settings = stripeSettings;
      else if (category === 'notification') settings = notificationSettings;

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, settings }),
      });

      if (res.ok) {
        alert('Settings saved successfully!');
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">System Settings</h1>
          <p className="text-gray-600">Configure your store settings without editing .env files</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('email')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'email'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Mail className="w-5 h-5 inline mr-2" />
                Email Settings
              </button>
              <button
                onClick={() => setActiveTab('stripe')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'stripe'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <CreditCard className="w-5 h-5 inline mr-2" />
                Payment Settings
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'notifications'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Bell className="w-5 h-5 inline mr-2" />
                Notifications
              </button>
            </nav>
          </div>

          {/* Email Settings Tab */}
          {activeTab === 'email' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Email Configuration</h2>
              <p className="text-gray-600 mb-6">Configure SMTP settings for sending emails</p>
              
              <div className="space-y-4 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    value={emailSettings.smtp_host}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtp_host: e.target.value })}
                    placeholder="smtp.gmail.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SMTP Port
                  </label>
                  <input
                    type="text"
                    value={emailSettings.smtp_port}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtp_port: e.target.value })}
                    placeholder="587"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SMTP Username
                  </label>
                  <input
                    type="text"
                    value={emailSettings.smtp_user}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtp_user: e.target.value })}
                    placeholder="your-email@gmail.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SMTP Password
                  </label>
                  <div className="relative">
                    <input
                      type={showSecrets.smtp_password ? 'text' : 'password'}
                      value={emailSettings.smtp_password}
                      onChange={(e) => setEmailSettings({ ...emailSettings, smtp_password: e.target.value })}
                      placeholder="Your app password"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSecret('smtp_password')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showSecrets.smtp_password ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Email Address
                  </label>
                  <input
                    type="email"
                    value={emailSettings.email_from}
                    onChange={(e) => setEmailSettings({ ...emailSettings, email_from: e.target.value })}
                    placeholder="noreply@yourstore.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={() => handleSave('email')}
                  disabled={saving}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Saving...' : 'Save Email Settings'}
                </button>
              </div>
            </div>
          )}

          {/* Stripe Settings Tab */}
          {activeTab === 'stripe' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Stripe Payment Configuration</h2>
              <p className="text-gray-600 mb-6">Configure your Stripe API keys for payment processing</p>
              
              <div className="space-y-4 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stripe Secret Key
                  </label>
                  <div className="relative">
                    <input
                      type={showSecrets.stripe_secret_key ? 'text' : 'password'}
                      value={stripeSettings.stripe_secret_key}
                      onChange={(e) => setStripeSettings({ ...stripeSettings, stripe_secret_key: e.target.value })}
                      placeholder="sk_test_..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSecret('stripe_secret_key')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showSecrets.stripe_secret_key ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stripe Publishable Key
                  </label>
                  <input
                    type="text"
                    value={stripeSettings.stripe_publishable_key}
                    onChange={(e) => setStripeSettings({ ...stripeSettings, stripe_publishable_key: e.target.value })}
                    placeholder="pk_test_..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stripe Webhook Secret
                  </label>
                  <div className="relative">
                    <input
                      type={showSecrets.stripe_webhook_secret ? 'text' : 'password'}
                      value={stripeSettings.stripe_webhook_secret}
                      onChange={(e) => setStripeSettings({ ...stripeSettings, stripe_webhook_secret: e.target.value })}
                      placeholder="whsec_..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSecret('stripe_webhook_secret')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showSecrets.stripe_webhook_secret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => handleSave('stripe')}
                  disabled={saving}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Saving...' : 'Save Stripe Settings'}
                </button>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Notification Settings</h2>
              <p className="text-gray-600 mb-6">Configure automated notifications and alerts</p>
              
              <div className="space-y-6 max-w-2xl">
                {/* Order Notifications */}
                <div className="border-b pb-6">
                  <h3 className="font-semibold mb-4">Order Notifications</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={notificationSettings.order_confirmation_enabled === 'true'}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, order_confirmation_enabled: e.target.checked ? 'true' : 'false' })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium">Order Confirmation Email</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={notificationSettings.order_shipped_enabled === 'true'}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, order_shipped_enabled: e.target.checked ? 'true' : 'false' })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium">Order Shipped Email</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={notificationSettings.order_delivered_enabled === 'true'}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, order_delivered_enabled: e.target.checked ? 'true' : 'false' })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium">Order Delivered Email</span>
                    </label>
                  </div>
                </div>

                {/* Abandoned Cart */}
                <div className="border-b pb-6">
                  <h3 className="font-semibold mb-4">Abandoned Cart Recovery</h3>
                  <div className="space-y-4">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={notificationSettings.abandoned_cart_enabled === 'true'}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, abandoned_cart_enabled: e.target.checked ? 'true' : 'false' })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium">Enable Abandoned Cart Recovery</span>
                    </label>
                    
                    {notificationSettings.abandoned_cart_enabled === 'true' && (
                      <div className="ml-8 space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            First Reminder (hours after abandonment)
                          </label>
                          <input
                            type="number"
                            value={notificationSettings.abandoned_cart_delay_hours}
                            onChange={(e) => setNotificationSettings({ ...notificationSettings, abandoned_cart_delay_hours: e.target.value })}
                            min="1"
                            className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Second Reminder (hours)
                          </label>
                          <input
                            type="number"
                            value={notificationSettings.abandoned_cart_reminder_2_hours}
                            onChange={(e) => setNotificationSettings({ ...notificationSettings, abandoned_cart_reminder_2_hours: e.target.value })}
                            min="1"
                            className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Final Reminder (hours)
                          </label>
                          <input
                            type="number"
                            value={notificationSettings.abandoned_cart_reminder_3_hours}
                            onChange={(e) => setNotificationSettings({ ...notificationSettings, abandoned_cart_reminder_3_hours: e.target.value })}
                            min="1"
                            className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inventory Alerts */}
                <div>
                  <h3 className="font-semibold mb-4">Inventory Alerts</h3>
                  <div className="space-y-4">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={notificationSettings.low_stock_alert_enabled === 'true'}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, low_stock_alert_enabled: e.target.checked ? 'true' : 'false' })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium">Low Stock Alerts</span>
                    </label>
                    
                    {notificationSettings.low_stock_alert_enabled === 'true' && (
                      <div className="ml-8">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Alert Threshold (units)
                        </label>
                        <input
                          type="number"
                          value={notificationSettings.low_stock_threshold}
                          onChange={(e) => setNotificationSettings({ ...notificationSettings, low_stock_threshold: e.target.value })}
                          min="0"
                          className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleSave('notification')}
                  disabled={saving}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Saving...' : 'Save Notification Settings'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <SettingsIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Settings Storage</p>
              <p>All settings are securely stored in the database. Sensitive values like passwords and API keys are encrypted. You can update these settings anytime without restarting your application.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
