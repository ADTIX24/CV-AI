/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface WorkExperience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
}

export interface Skill {
  id: string;
  name: string;
  level: 'Beginner' | 'Intermediate' | 'Expert';
}

export interface Language {
  id: string;
  name: string;
  proficiency: number; // 1-5 scale or slider
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
}

export interface CVProject {
  id: string;
  name: string;
  role: string;
  description: string;
  link?: string;
}

export interface CVProfile {
  id?: string;
  unlockedSnapshot?: string;
  fullName: string;
  email: string;
  phone: string;
  jobTitle: string;
  location: string;
  summary: string;
  experiences: WorkExperience[];
  educations: Education[];
  skills: string[];
  languages: Language[];
  certifications: string[];
  photoUrl: string; // Original uploaded photo
  enhancedPhotoUrl: string; // AI Enhanced photo (suit + smile + watermark)
  enhancedPhotoNoWatermarkUrl: string; // Paid AI Enhanced photo (no watermark)
  isEnhanced: boolean;
  selectedTemplate: string;
  website?: string;
  linkedin?: string;
  github?: string;
  projects?: CVProject[];
  logoUrl?: string;
}

export interface Voucher {
  code: string;
  value: number; // in credits/dollars
  active: boolean; // true if unused
  groupName: string; // Name of merchant or library batch
  createdAt: string;
}

export interface SocialLink {
  id: string;
  platform: 'facebook' | 'instagram' | 'linkedin' | 'telegram' | 'twitter' | 'youtube' | 'whatsapp' | 'tiktok' | 'other';
  url: string;
  active: boolean;
}

export interface CustomPage {
  id: string;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  active: boolean;
}

export interface AppConfig {
  appName: string;
  logoText: string;
  facebookUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  telegramUrl?: string;
  logoUrl?: string; // Custom uploaded logo from file system
  footerTextAr?: string;
  footerTextEn?: string;
  socialLinks?: SocialLink[];
  pages?: CustomPage[];
  supportWhatsAppPhone?: string;
  supportTelegramUsername?: string;
  registerGiftCredits?: number;
}

export interface ClientAccount {
  id: string;
  uid?: string;
  name: string;
  email: string;
  credits: number;
  resumesCreated: number;
  joinedAt: string;
}

export interface SystemStats {
  onlineUsers: number;
  totalResumes: number;
  totalSales: number; // Total dollars loaded
  registeredCount: number;
}
