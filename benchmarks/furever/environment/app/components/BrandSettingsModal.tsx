'use client';

import * as React from 'react';
import {useSession} from 'next-auth/react';
import Image from 'next/image';
import {LoaderCircle, X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {SettingsContext} from '../contexts/settings';
import {defaultPrimaryColor} from '../contexts/themes/ThemeConstants';
import BrandSettingsIcon from '@/public/brand-settings.svg';

const BrandSettingsModal = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const {data: session, update} = useSession();
  const settings = React.useContext(SettingsContext);

  // Local state for form values
  const [primaryColor, setPrimaryColor] = React.useState(
    settings.primaryColor || defaultPrimaryColor
  );
  const [companyName, setCompanyName] = React.useState(
    settings.companyName || 'Furever'
  );
  const [companyLogo, setCompanyLogo] = React.useState<File | null>(null);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(
    settings.companyLogoUrl || null
  );

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const isValidColor = /^#[0-9A-F]{6}$/i.test(primaryColor);

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setPrimaryColor(settings.primaryColor || defaultPrimaryColor);
      setCompanyName(settings.companyName || 'Furever');
      setCompanyLogo(null);
      setLogoPreview(settings.companyLogoUrl || null);
    }
  }, [isOpen, settings]);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 512 * 1024) {
      alert('File size must be less than 512KB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Only image files are allowed');
      return;
    }

    setCompanyLogo(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Prepare all API requests to run in parallel
      const requests = [
        // Update primary color
        fetch('/api/primary_color', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({primaryColor}),
        }),
        // Update company name
        fetch('/api/company_name', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({companyName: companyName.trim()}),
        }),
      ];

      // Add company logo request if there's a new logo to upload
      if (companyLogo) {
        const formData = new FormData();
        formData.append('file', companyLogo);
        requests.push(
          fetch('/api/company_logo', {
            method: 'POST',
            body: formData,
          })
        );
      }

      // Execute all requests in parallel
      const responses = await Promise.all(requests);

      // Check for errors in responses
      for (const response of responses) {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
      }

      // Update settings context
      settings.handleUpdate({
        primaryColor,
        companyName: companyName.trim(),
        companyLogoUrl: logoPreview || undefined,
      });

      // Update session
      await update({
        user: {
          ...session?.user,
          companyName: companyName.trim(),
          companyLogoUrl: logoPreview || undefined,
        },
      });

      setIsOpen(false);
    } catch (error) {
      console.error('Error saving brand settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const handleDeleteLogo = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/company_logo', {
        method: 'DELETE',
      });

      if (response.ok) {
        setLogoPreview(null);
        setCompanyLogo(null);

        // Update settings context
        settings.handleUpdate({companyLogoUrl: undefined});

        // Update session
        await update({
          user: {
            ...session?.user,
            companyLogoUrl: undefined,
          },
        });
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Delete failed');
      }
    } catch (error) {
      console.error('Error deleting logo:', error);
      alert('Error deleting logo. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="invisible p-1 sm:visible">
          <Image
            src={BrandSettingsIcon}
            alt="Brand settings"
            width={12}
            height={12}
          />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Brand settings</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-y-4">
          {/* Primary Color */}
          <div className="flex flex-col gap-y-2">
            <Label className="text-left" htmlFor="primaryColor">
              Primary color
            </Label>
            <div className="flex items-center gap-2">
              <div className="h-8">
                {/* The input itself can't be styled as we'd like, so we hide it and use the span to show the color */}
                <Input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="pointer-events-none absolute h-8 w-8 opacity-0"
                  id="color-picker"
                />
                <span
                  onClick={() =>
                    document.getElementById('color-picker')?.click()
                  }
                  className="inline-block h-8 w-8 cursor-pointer rounded-md border"
                  style={{backgroundColor: primaryColor}}
                  title="Custom color picker"
                />
              </div>
              <Input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-8 flex-1 text-sm"
                placeholder={defaultPrimaryColor}
              />
            </div>
          </div>

          {/* Company Name */}
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="company-name">Company name</Label>
            <Input
              id="company-name"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter your company name"
              maxLength={100}
            />
          </div>

          {/* Company Logo */}
          <div className="flex flex-col gap-y-2">
            <Label>Company logo</Label>
            {logoPreview && (
              <div className="group relative h-16 w-16 overflow-hidden rounded-lg bg-gray-100">
                <Image
                  src={logoPreview}
                  alt="Company Logo"
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={handleDeleteLogo}
                  disabled={loading}
                  className="absolute right-0 top-0 rounded-bl bg-black/50 p-1 text-white opacity-0 transition-opacity disabled:opacity-50 group-hover:opacity-100"
                  title="Remove logo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              variant="ghost"
              className="w-full border"
              size="sm"
            >
              Upload logo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoSelect}
              className="hidden"
            />
            <p className="text-xs text-gray-500">
              Upload an image file (max 512KB)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flew-row flex justify-end space-x-2">
          <Button variant="secondary" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleSave}
            disabled={loading || !isValidColor || !companyName.trim()}
            type="submit"
          >
            {loading ? (
              <LoaderCircle
                className="mr-1 animate-spin items-center"
                size={20}
              />
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BrandSettingsModal;
