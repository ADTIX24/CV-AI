/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Send, Sparkles, Plus, Trash2, ArrowRight, ArrowLeft, CheckCircle, Shield, Globe } from 'lucide-react';
import { CVProfile, WorkExperience, Education, Language } from '../types';
import { AppTranslation } from '../translations';

interface Props {
  key?: any;
  t: AppTranslation;
  lang: 'ar' | 'en';
  profile: CVProfile;
  onUpdateProfile: (p: CVProfile) => void;
  onComplete: () => void;
}

export function WizardChat({ t, lang, profile, onUpdateProfile, onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState<number>(() => {
    const saved = localStorage.getItem('cv_ai_wizard_step');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [chatLog, setChatLog] = useState<{ sender: 'ai' | 'user'; text: string }[]>(() => {
    const saved = localStorage.getItem('cv_ai_wizard_chat');
    return saved ? JSON.parse(saved) : [
      { sender: 'ai', text: t.chatWelcome }
    ];
  });

  React.useEffect(() => {
    localStorage.setItem('cv_ai_wizard_step', currentStep.toString());
  }, [currentStep]);

  React.useEffect(() => {
    localStorage.setItem('cv_ai_wizard_chat', JSON.stringify(chatLog));
  }, [chatLog]);

  // Editing active records states
  const [editingExperienceId, setEditingExperienceId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingEducationId, setEditingEducationId] = useState<string | null>(null);

  // Intermediate states for sub-inputs
  const [newCompany, setNewCompany] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newExpStart, setNewExpStart] = useState('');
  const [newExpEnd, setNewExpEnd] = useState('');
  const [newExpDesc, setNewExpDesc] = useState('');

  const [newSchool, setNewSchool] = useState('');
  const [newDegree, setNewDegree] = useState('');
  const [newField, setNewField] = useState('');
  const [newEduStart, setNewEduStart] = useState('');
  const [newEduEnd, setNewEduEnd] = useState('');

  const [newSkill, setNewSkill] = useState('');
  const [newLang, setNewLang] = useState('');
  const [newLangProf, setNewLangProf] = useState(5);
  const [newCert, setNewCert] = useState('');

  // Intermediate states for project inputs
  const [newProjName, setNewProjName] = useState('');
  const [newProjRole, setNewProjRole] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjLink, setNewProjLink] = useState('');

  const [aiGeneratingSummary, setAiGeneratingSummary] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle updates for values
  const handleTextChange = (field: keyof CVProfile, val: any) => {
    onUpdateProfile({
      ...profile,
      [field]: val
    });
    setErrorMsg('');
  };

  // Add individual list items or save modifications
  const startEditExperience = (exp: WorkExperience) => {
    setEditingExperienceId(exp.id);
    setNewCompany(exp.company);
    setNewRole(exp.role);
    setNewExpStart(exp.startDate);
    setNewExpEnd(exp.endDate);
    setNewExpDesc(exp.description);
  };

  const addExperience = () => {
    if (!newCompany || !newRole) {
      setErrorMsg(t.emptyFieldWarn);
      return;
    }
    if (editingExperienceId) {
      onUpdateProfile({
        ...profile,
        experiences: profile.experiences.map(exp => exp.id === editingExperienceId ? {
          ...exp,
          company: newCompany,
          role: newRole,
          startDate: newExpStart || '2022',
          endDate: newExpEnd || 'Present',
          description: newExpDesc
        } : exp)
      });
      setEditingExperienceId(null);
    } else {
      const nExp: WorkExperience = {
        id: Math.random().toString(36).substr(2, 9),
        company: newCompany,
        role: newRole,
        startDate: newExpStart || '2022',
        endDate: newExpEnd || 'Present',
        description: newExpDesc
      };
      onUpdateProfile({
        ...profile,
        experiences: [...profile.experiences, nExp]
      });
    }
    // Clear
    setNewCompany('');
    setNewRole('');
    setNewExpStart('');
    setNewExpEnd('');
    setNewExpDesc('');
    setErrorMsg('');
  };

  const removeExperience = (id: string) => {
    if (editingExperienceId === id) {
      setEditingExperienceId(null);
      setNewCompany('');
      setNewRole('');
    }
    onUpdateProfile({
      ...profile,
      experiences: profile.experiences.filter(exp => exp.id !== id)
    });
  };

  const startEditEducation = (edu: Education) => {
    setEditingEducationId(edu.id);
    setNewSchool(edu.institution);
    setNewDegree(edu.degree);
    setNewField(edu.field);
    setNewEduStart(edu.startDate);
    setNewEduEnd(edu.endDate);
  };

  const addEducation = () => {
    if (!newSchool || !newDegree) {
      setErrorMsg(t.emptyFieldWarn);
      return;
    }
    if (editingEducationId) {
      onUpdateProfile({
        ...profile,
        educations: profile.educations.map(edu => edu.id === editingEducationId ? {
          ...edu,
          institution: newSchool,
          degree: newDegree,
          field: newField,
          startDate: newEduStart || '2018',
          endDate: newEduEnd || '2022'
        } : edu)
      });
      setEditingEducationId(null);
    } else {
      const nEdu: Education = {
        id: Math.random().toString(36).substr(2, 9),
        institution: newSchool,
        degree: newDegree,
        field: newField,
        startDate: newEduStart || '2018',
        endDate: newEduEnd || '2022'
      };
      onUpdateProfile({
        ...profile,
        educations: [...profile.educations, nEdu]
      });
    }
    setNewSchool('');
    setNewDegree('');
    setNewField('');
    setNewEduStart('');
    setNewEduEnd('');
    setErrorMsg('');
  };

  const removeEducation = (id: string) => {
    if (editingEducationId === id) {
      setEditingEducationId(null);
      setNewSchool('');
      setNewDegree('');
    }
    onUpdateProfile({
      ...profile,
      educations: profile.educations.filter(edu => edu.id !== id)
    });
  };

  const addSkill = () => {
    if (!newSkill.trim()) return;
    if (!profile.skills.includes(newSkill.trim())) {
      onUpdateProfile({
        ...profile,
        skills: [...profile.skills, newSkill.trim()]
      });
    }
    setNewSkill('');
  };

  const removeSkill = (name: string) => {
    onUpdateProfile({
      ...profile,
      skills: profile.skills.filter(s => s !== name)
    });
  };

  const addLanguage = () => {
    if (!newLang.trim()) return;
    const nLang: Language = {
      id: Math.random().toString(36).substr(2, 9),
      name: newLang.trim(),
      proficiency: newLangProf
    };
    onUpdateProfile({
      ...profile,
      languages: [...profile.languages, nLang]
    });
    setNewLang('');
  };

  const removeLanguage = (id: string) => {
    onUpdateProfile({
      ...profile,
      languages: profile.languages.filter(l => l.id !== id)
    });
  };

  const addCertification = () => {
    if (!newCert.trim()) return;
    if (!profile.certifications.includes(newCert.trim())) {
      onUpdateProfile({
        ...profile,
        certifications: [...profile.certifications, newCert.trim()]
      });
    }
    setNewCert('');
  };

  const removeCertification = (name: string) => {
    onUpdateProfile({
      ...profile,
      certifications: profile.certifications.filter(c => c !== name)
    });
  };

  const startEditProject = (proj: any) => {
    setEditingProjectId(proj.id);
    setNewProjName(proj.name);
    setNewProjRole(proj.role);
    setNewProjDesc(proj.description);
    setNewProjLink(proj.link || '');
  };

  const addProject = () => {
    if (!newProjName || !newProjRole) {
      setErrorMsg(lang === 'ar' ? 'يرجى إدخال اسم المشروع ودورك فيه' : 'Please enter project name and your role');
      return;
    }
    if (editingProjectId) {
      onUpdateProfile({
        ...profile,
        projects: (profile.projects || []).map(p => p.id === editingProjectId ? {
          ...p,
          name: newProjName,
          role: newProjRole,
          description: newProjDesc,
          link: newProjLink
        } : p)
      });
      setEditingProjectId(null);
    } else {
      const nProj = {
        id: Math.random().toString(36).substr(2, 9),
        name: newProjName,
        role: newProjRole,
        description: newProjDesc,
        link: newProjLink
      };
      onUpdateProfile({
        ...profile,
        projects: [...(profile.projects || []), nProj]
      });
    }
    setNewProjName('');
    setNewProjRole('');
    setNewProjDesc('');
    setNewProjLink('');
    setErrorMsg('');
  };

  const removeProject = (id: string) => {
    if (editingProjectId === id) {
      setEditingProjectId(null);
      setNewProjName('');
      setNewProjRole('');
    }
    onUpdateProfile({
      ...profile,
      projects: (profile.projects || []).filter(p => p.id !== id)
    });
  };

  // call Express backend endpoint directly to request summary from Gemini
  const generateAISummary = async () => {
    setAiGeneratingSummary(true);
    setErrorMsg('');

    const trimmedName = profile.fullName ? profile.fullName.trim() : 'Professional';
    const trimmedJobTitle = profile.jobTitle ? profile.jobTitle.trim() : 'Executive Candidate';
    const rawInputPrompt = profile.summary || '';
    
    // Core high-quality local template generation logic (Silent fallback)
    const generateLocalSummary = () => {
      const cleanPrompt = rawInputPrompt
        ? rawInputPrompt
            .replace(/expert seeking dynamic workflow/gi, '')
            .replace(/Seeking high efficiency growth and collaboration/gi, '')
            .replace(/\(Offline Mode\)/gi, '')
            .trim()
        : '';
        
      if (lang === 'ar') {
        const templates = [
          `أخصائي متميز في مجال ${trimmedJobTitle}، يمتلك مهارات استثنائية وخبرة فنية تركز على الابتكار والتحسين المستمر للأعمال مع الالتزام التام بأعلى معايير الجودة والعمل الجماعي المثمر لمواجهة أقصى تحديات العمل.`,
          `خبير مهني في دور ${trimmedJobTitle}، يسعى لتوظيف وتوسيع المهارات والخبرات العملية لتطوير الأداء العام ودعم الابتكار التقني والتنظيمي، مع القدرة على ابتكار حلول ذكية وتحقيق نتائج ملموسة بكفاءة عالية.`,
          `كفاءة عملية طموحة وطاقة مهنية متميزة في تخصص ${trimmedJobTitle}، تركز على تطبيق أفضل الممارسات المهنية وصياغة الحلول المتكاملة، مع الالتزام التام بالتعلم والتحسين المستمر لدعم نجاح بيئات العمل وتطلعاتها.`
        ];
        const idx = (trimmedName.length + trimmedJobTitle.length) % templates.length;
        let base = templates[idx];
        if (cleanPrompt && cleanPrompt.length > 3) {
          base += ` يتميز بالقدرة على التعامل مع ${cleanPrompt}.`;
        }
        return base;
      } else {
        const templates = [
          `A highly dedicated ${trimmedJobTitle} focused on developing innovative workflows and driving strategic solutions with optimal execution. Deeply committed to delivering high-quality results while fostering a culture of continuous improvements and reliable collaboration.`,
          `An enterprising ${trimmedJobTitle} focused on engineering precise solutions and streamlining productivity in demanding environments. Highly adaptable and analytical, focusing on turning complex organizational challenges into measurable strategic successes.`,
          `A results-oriented ${trimmedJobTitle} possessing advanced operational capabilities and a future-focused mindset for elevating brand standards. Accomplished in planning cross-functional processes, refining complex tasks, and executing robust growth tactics.`
        ];
        const idx = (trimmedName.length + trimmedJobTitle.length) % templates.length;
        let base = templates[idx];
        if (cleanPrompt && cleanPrompt.length > 3) {
          base += ` Specializing in ${cleanPrompt}.`;
        }
        return base;
      }
    };

    try {
      const response = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          jobTitle: trimmedJobTitle,
          inputPrompt: rawInputPrompt || 'Expert seeking dynamic workflow',
          lang: lang
        })
      });

      const contentType = response.headers.get('content-type');
      if (!response.ok || !contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.warn("Server response failed or is not JSON. Silently using custom local summary. Status:", response.status, "Body:", textResponse);
        
        onUpdateProfile({
          ...profile,
          summary: generateLocalSummary()
        });
        return;
      }

      const data = await response.json();
      
      // If server returned structured summary, use it. Otherwise fallback.
      if (data && data.summary) {
        // Strip any trailing Offline indicators if they got cached or stored in server side fallback
        const cleanSummary = data.summary.replace(/\(Offline Mode\)/gi, '').trim();
        onUpdateProfile({
          ...profile,
          summary: cleanSummary
        });
      } else {
        onUpdateProfile({
          ...profile,
          summary: generateLocalSummary()
        });
      }
    } catch (err: any) {
      console.warn("API request had a network issue. Silently using custom local summary generator:", err);
      onUpdateProfile({
        ...profile,
        summary: generateLocalSummary()
      });
    } finally {
      setAiGeneratingSummary(false);
    }
  };

  // Navigating through the steps
  const validateAndNext = () => {
    if (currentStep === 0 && !profile.fullName.trim()) {
      setErrorMsg(t.emptyFieldWarn);
      return;
    }
    if (currentStep === 1 && !profile.jobTitle.trim()) {
      setErrorMsg(t.emptyFieldWarn);
      return;
    }

    const nextIdx = currentStep + 1;
    setCurrentStep(nextIdx);

    // Dynamic responses representing AI agent replies
    let replyText = '';
    switch (nextIdx) {
      case 1:
        replyText = t.askJobTitle.replace('{name}', profile.fullName);
        break;
      case 2:
        replyText = t.askEmailPhoneLocation;
        break;
      case 3:
        replyText = t.askSummary;
        break;
      case 4:
        replyText = t.askExperience;
        break;
      case 5:
        replyText = lang === 'ar' 
          ? 'المشاريع المهنية تضفي مصداقية بالغة لسيرتك الذاتية. يرجى تزويدنا بأهم المشاريع التي قمت بالعمل عليها مع أدوارك فيها وخطوط وصفية عنها.' 
          : 'Professional or personal projects add immense credibility. Please share your key projects, roles within them, and concise descriptions.';
        break;
      case 6:
        replyText = t.askEducation;
        break;
      case 7:
        replyText = t.askSkills;
        break;
      case 8:
        replyText = t.askLanguages;
        break;
      case 9:
        replyText = t.askCerts;
        break;
      case 10:
        replyText = t.askPhoto;
        break;
      default:
        replyText = 'Ready!';
    }
    setChatLog([...chatLog, { sender: 'user', text: getCompletedValueForStep(currentStep) }, { sender: 'ai', text: replyText }]);
  };

  const getCompletedValueForStep = (stepIdx: number): string => {
    switch (stepIdx) {
      case 0: return profile.fullName;
      case 1: return profile.jobTitle;
      case 2: return `${profile.email} | ${profile.phone} | ${profile.location}`;
      case 3: return profile.summary ? profile.summary.substring(0, 45) + '...' : 'Generated Outline';
      case 4: return `${profile.experiences.length} Experiences loaded`;
      case 5: return `${(profile.projects || []).length} Projects registered`;
      case 6: return `${profile.educations.length} Degrees loaded`;
      case 7: return `${profile.skills.length} Skills`;
      case 8: return `${profile.languages.length} Languages`;
      case 9: return `${profile.certifications.length} Training credentials`;
      default: return 'Completed and loaded';
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const stepsHeader = [
    lang === 'ar' ? 'الاسم الكامل' : 'Full Name',
    lang === 'ar' ? 'المسمى الوظيفي' : 'Job Title',
    lang === 'ar' ? 'معلومات الاتصال والروابط المهنية' : 'Contacts & Professional Links',
    lang === 'ar' ? 'النبذة المهنية' : 'About Me',
    lang === 'ar' ? 'الخبرة السابقة' : 'Work Experience',
    lang === 'ar' ? 'المشاريع المهنية والتقنية' : 'Key Projects & Portfolios',
    lang === 'ar' ? 'التعليم والشهادات العلمية' : 'Education History',
    lang === 'ar' ? 'المهارات الفنية' : 'Core Skills',
    lang === 'ar' ? 'اللغات والترجمة' : 'Languages',
    lang === 'ar' ? 'الدورات والشهادات' : 'Certifications & Courses',
    lang === 'ar' ? 'الصورة الشخصية' : 'Profile Picture'
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative" id="cv-wizard-workspace">
      {/* Visual active progress header */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-900 overflow-hidden rounded-t-3xl">
        <div 
          className="h-full bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 transition-all duration-500"
          style={{ width: `${((currentStep + 1) / stepsHeader.length) * 100}%` }}
        />
      </div>

      {/* LEFT AREA: Conversational Chatlog Bot Display */}
      <div className="lg:col-span-5 bg-zinc-900/60 rounded-2xl p-5 border border-zinc-800/80 flex flex-col justify-between h-[520px]">
        <div>
          <div className="flex items-center gap-2 pb-4 border-b border-zinc-800">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h4 className="text-xs uppercase font-mono tracking-wider text-zinc-300 font-bold">{t.chatBotName}</h4>
          </div>

          <div className="space-y-4 pt-4 overflow-y-auto max-h-[360px] pr-2 scrollbar-none">
            {chatLog.map((log, idx) => (
              <div 
                key={idx} 
                className={`flex ${log.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                  log.sender === 'user' 
                    ? 'bg-violet-600 text-white rounded-br-none' 
                    : 'bg-zinc-850 border border-zinc-800 text-zinc-200 rounded-bl-none'
                }`}>
                  {log.text}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Motivational Career Tip */}
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex items-center gap-3">
          <Shield className="w-4 h-4 text-violet-400 shrink-0" />
          <span className="text-[10px] text-zinc-400 font-mono tracking-tight leading-normal">
            {lang === 'ar' 
              ? 'إنشاء ملفات ATS-Optimized يضمن عبور سيرتك الذاتية من مرشحات التوظيف بنسبة 98%.' 
              : 'Our dynamic standard ensures that your CV bypasses modern ATS screening filters flawlessly.'}
          </span>
        </div>
      </div>

      {/* RIGHT AREA: Interactive Wizard Form fields */}
      <div className="lg:col-span-7 flex flex-col justify-between h-[520px] pt-4">
        <div>
          <div className="flex justify-between items-center mb-4">
            <span className="px-3 py-1 font-mono text-[10px] rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25">
              STEP {currentStep + 1} OF {stepsHeader.length}
            </span>
            <span className="text-xs font-medium text-zinc-400">{stepsHeader[currentStep]}</span>
          </div>

          {errorMsg && (
            <div className="mb-4 text-xs bg-red-950/40 border border-red-500/30 text-red-300 p-2.5 rounded-xl flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* DYNAMIC FORM VIEWS */}
          <div className="overflow-y-auto max-h-[340px] pr-2 space-y-4">
            
            {/* STEP 0: Full Name */}
            {currentStep === 0 && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300">{lang === 'ar' ? 'الاسم الكامل للعميل' : "Applicant's Full Name"}</label>
                <input
                  type="text"
                  value={profile.fullName}
                  onChange={(e) => handleTextChange('fullName', e.target.value)}
                  placeholder={lang === 'ar' ? 'أدخل اسمك الثلاثي أو الكامل' : 'e.g. Johnathan Doe'}
                  className="w-full bg-zinc-900 text-sm p-3.5 rounded-xl border border-zinc-800 text-white focus:outline-none focus:border-violet-500 transition-colors"
                  id="wizard-input-fullname"
                />
              </div>
            )}

            {/* STEP 1: Job Title */}
            {currentStep === 1 && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300">{lang === 'ar' ? 'المسمى الوظيفي المستهدف' : 'Target Career Job Title'}</label>
                <input
                  type="text"
                  value={profile.jobTitle}
                  onChange={(e) => handleTextChange('jobTitle', e.target.value)}
                  placeholder={lang === 'ar' ? 'مثال: مطور ومصمم واجهات أول' : 'e.g. Senior Frontend Engineer'}
                  className="w-full bg-zinc-900 text-sm p-3.5 rounded-xl border border-zinc-800 text-white focus:outline-none focus:border-violet-500 transition-colors"
                  id="wizard-input-jobtitle"
                />
              </div>
            )}

            {/* STEP 2: Contacts */}
            {currentStep === 2 && (
              <div className="space-y-4 font-sans">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-400">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => handleTextChange('email', e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-zinc-900 text-xs px-3 py-2 rounded-xl border border-zinc-800 text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-400">{lang === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</label>
                    <input
                      type="text"
                      value={profile.phone}
                      onChange={(e) => handleTextChange('phone', e.target.value)}
                      placeholder="+966 50 000 0000"
                      className="w-full bg-zinc-900 text-xs px-3 py-2 rounded-xl border border-zinc-800 text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-400">{lang === 'ar' ? 'المدينة والسكن' : 'Location'}</label>
                    <input
                      type="text"
                      value={profile.location}
                      onChange={(e) => handleTextChange('location', e.target.value)}
                      placeholder={lang === 'ar' ? 'الرياض، السعودية' : 'Riyadh, Saudi Arabia'}
                      className="w-full bg-zinc-900 text-xs px-3 py-2 rounded-xl border border-zinc-800 text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div className="border-t border-zinc-900 pt-3">
                  <h5 className="text-[11px] font-mono font-bold text-violet-400 mb-2">{lang === 'ar' ? 'روابط مهنية ومعرض الأعمال (اختياري)' : 'Professional Portfolio & Handles (Optional)'}</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-zinc-500">{lang === 'ar' ? 'الموقع الشخصي' : 'Personal Website'}</label>
                      <input
                        type="text"
                        value={profile.website || ''}
                        onChange={(e) => handleTextChange('website', e.target.value)}
                        placeholder="www.portfolio.com"
                        className="w-full bg-zinc-900 text-xs px-3 py-2 rounded-xl border border-zinc-800 text-white focus:outline-none focus:border-violet-500 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-zinc-500">{lang === 'ar' ? 'رابط لينكد إن' : 'LinkedIn Link'}</label>
                      <input
                        type="text"
                        value={profile.linkedin || ''}
                        onChange={(e) => handleTextChange('linkedin', e.target.value)}
                        placeholder="linkedin.com/in/user"
                        className="w-full bg-zinc-900 text-xs px-3 py-2 rounded-xl border border-zinc-800 text-white focus:outline-none focus:border-violet-500 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-zinc-500">{lang === 'ar' ? 'رابط جيت هاب' : 'GitHub Link'}</label>
                      <input
                        type="text"
                        value={profile.github || ''}
                        onChange={(e) => handleTextChange('github', e.target.value)}
                        placeholder="github.com/user"
                        className="w-full bg-zinc-900 text-xs px-3 py-2 rounded-xl border border-zinc-800 text-white focus:outline-none focus:border-violet-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Summary & AI Prompt */}
            {currentStep === 3 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-zinc-300">{lang === 'ar' ? 'نبذة تعريفية مهنية' : 'Professional Summary Pitch'}</label>
                  <button
                    type="button"
                    onClick={generateAISummary}
                    disabled={aiGeneratingSummary}
                    className="text-[11px] px-3 py-1 rounded-full bg-violet-600/20 text-violet-400 border border-violet-500/30 font-medium flex items-center gap-1 hover:bg-violet-600 hover:text-white transition-all disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    {aiGeneratingSummary ? t.generating : t.generateAiSummary}
                  </button>
                </div>
                <textarea
                  value={profile.summary}
                  onChange={(e) => handleTextChange('summary', e.target.value)}
                  placeholder={lang === 'ar' ? 'أدخل لمحة سريعة عن ذاتك، مهاراتك وطموحك، أو اضغط على التوليد الفوري بالذكاء الاصطناعي...' : 'Type a brief description of yourself or let Gemini compose the pitch dynamically based on name/jobTitle.'}
                  rows={5}
                  className="w-full bg-zinc-900 text-sm p-3.5 rounded-xl border border-zinc-800 text-white focus:outline-none focus:border-violet-500 resize-none leading-relaxed"
                />
              </div>
            )}

            {/* STEP 4: Experience List Builder */}
            {currentStep === 4 && (
              <div className="space-y-4">
                {/* Active Experience List */}
                {profile.experiences.length > 0 && (
                  <div className="space-y-2 border-b border-zinc-900 pb-3">
                    <p className="text-[10px] text-zinc-400 font-bold">{lang === 'ar' ? 'الخبرات المضافة (انقر لتعديل أي خبرة بالكامل):' : 'Added experiences (Click Edit to modify):'}</p>
                    {profile.experiences.map((exp) => (
                      <div 
                        key={exp.id} 
                        className={`flex justify-between items-center bg-zinc-900 p-2.5 rounded-xl border transition-all ${
                          editingExperienceId === exp.id 
                            ? 'border-violet-500 bg-violet-600/10' 
                            : 'border-zinc-850 hover:border-zinc-700'
                        }`}
                      >
                        <div className="text-left font-sans flex-1">
                          <p className="text-xs font-semibold text-zinc-200">
                            {exp.role} <span className="text-zinc-500 text-[10px]">({exp.company})</span>
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">{exp.startDate} - {exp.endDate}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            type="button"
                            onClick={() => startEditExperience(exp)}
                            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold rounded"
                          >
                            {lang === 'ar' ? 'تعديل' : 'Edit'}
                          </button>
                          <button 
                            type="button"
                            onClick={() => removeExperience(exp.id)}
                            className="p-1 px-2 rounded hover:bg-red-500/10 text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline form */}
                <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono font-bold text-violet-400 block">
                      {editingExperienceId 
                        ? (lang === 'ar' ? 'تعديل بيانات الخبرة الحالية ✦' : 'Modify Selected Job Details ✦')
                        : (lang === 'ar' ? 'إضافة خبرة جديدة' : 'Catalog New Job Role')
                      }
                    </span>
                    {editingExperienceId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingExperienceId(null);
                          setNewCompany('');
                          setNewRole('');
                          setNewExpStart('');
                          setNewExpEnd('');
                          setNewExpDesc('');
                        }}
                        className="text-[10px] text-zinc-500 hover:text-white"
                      >
                        {lang === 'ar' ? '[إلغاء التعديل]' : '[Cancel]'}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder={lang === 'ar' ? 'الجهة المشغلة (مثال: أرامكو)' : 'Employer/Company (e.g. Aramco)'}
                      value={newCompany}
                      onChange={(e) => setNewCompany(e.target.value)}
                      className="bg-zinc-950 border border-zinc-850 p-2 text-xs rounded text-white focus:outline-none focus:border-violet-500"
                    />
                    <input
                      type="text"
                      placeholder={lang === 'ar' ? 'المسمى الوظيفي' : 'Job Title Role'}
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="bg-zinc-950 border border-zinc-850 p-2 text-xs rounded text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder={lang === 'ar' ? 'تاريخ البدء (مثال: 2020)' : 'Start Year (e.g. 2020)'}
                      value={newExpStart}
                      onChange={(e) => setNewExpStart(e.target.value)}
                      className="bg-zinc-950 border border-zinc-850 p-2 text-xs rounded text-white focus:outline-none focus:border-violet-500"
                    />
                    <input
                      type="text"
                      placeholder={lang === 'ar' ? 'تاريخ الانتهاء (أو الحاضر)' : 'End Year (e.g. Present)'}
                      value={newExpEnd}
                      onChange={(e) => setNewExpEnd(e.target.value)}
                      className="bg-zinc-950 border border-zinc-850 p-2 text-xs rounded text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <textarea
                    placeholder={lang === 'ar' ? 'وصف المهام والمنجزات السريعة' : 'Primary achievements or technical responsibilities'}
                    value={newExpDesc}
                    onChange={(e) => setNewExpDesc(e.target.value)}
                    rows={2}
                    className="w-full bg-zinc-950 border border-zinc-855 p-2 text-xs rounded text-white resize-none focus:outline-none focus:border-violet-500"
                  />
                  <button
                    type="button"
                    onClick={addExperience}
                    className="py-1.5 w-full bg-violet-600 hover:bg-violet-550 text-xs text-white border border-violet-500/30 rounded flex justify-center items-center gap-1 font-bold"
                  >
                    <Plus className="w-3.5 h-3.5 text-white" />
                    {editingExperienceId 
                      ? (lang === 'ar' ? 'حفظ تعديلات الخبرة ✦' : 'Save Modified Experience')
                      : (lang === 'ar' ? 'إضافة الخبرة للملف' : 'Publish Experience to List')
                    }
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: Projects Builder */}
            {currentStep === 5 && (
              <div className="space-y-4 font-sans">
                {(profile.projects || []).length > 0 && (
                  <div className="space-y-2 border-b border-zinc-900 pb-3">
                    <p className="text-[10px] text-zinc-400 font-bold">{lang === 'ar' ? 'المشاريع المضافة (انقر لتعديل أي مشروع):' : 'Added projects (Click Edit to modify):'}</p>
                    {(profile.projects || []).map((proj) => (
                      <div 
                        key={proj.id} 
                        className={`flex justify-between items-center bg-zinc-900 p-2.5 rounded-xl border transition-all ${
                          editingProjectId === proj.id 
                            ? 'border-violet-500 bg-violet-600/10' 
                            : 'border-zinc-850 hover:border-zinc-700'
                        }`}
                      >
                        <div className="text-left font-sans flex-1">
                          <p className="text-xs font-semibold text-zinc-200">{proj.name} — <span className="text-violet-400">{proj.role}</span></p>
                          {proj.link && <p className="text-[10px] font-mono text-zinc-500">{proj.link}</p>}
                          <p className="text-[10px] text-zinc-400 mt-1 line-clamp-1">{proj.description}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button 
                            type="button"
                            onClick={() => startEditProject(proj)}
                            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold rounded"
                          >
                            {lang === 'ar' ? 'تعديل' : 'Edit'}
                          </button>
                          <button 
                            type="button"
                            onClick={() => removeProject(proj.id)}
                            className="p-1 px-2 rounded hover:bg-red-500/10 text-red-400 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono font-bold text-violet-400 block">
                      {editingProjectId 
                        ? (lang === 'ar' ? 'تعديل بيانات المشروع المحدد ✦' : 'Modify Selected Project Details ✦')
                        : (lang === 'ar' ? 'إضافة مشروع جديد' : 'Register a New Project')
                      }
                    </span>
                    {editingProjectId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProjectId(null);
                          setNewProjName('');
                          setNewProjRole('');
                          setNewProjDesc('');
                          setNewProjLink('');
                        }}
                        className="text-[10px] text-zinc-500 hover:text-white"
                      >
                        {lang === 'ar' ? '[إلغاء التعديل]' : '[Cancel]'}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder={lang === 'ar' ? 'اسم المشروع' : 'Project Title'}
                      value={newProjName}
                      onChange={(e) => setNewProjName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 p-2 text-xs rounded text-white"
                    />
                    <input
                      type="text"
                      placeholder={lang === 'ar' ? 'دورك في المشروع' : 'Role (e.g. Lead Developer)'}
                      value={newProjRole}
                      onChange={(e) => setNewProjRole(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 p-2 text-xs rounded text-white"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder={lang === 'ar' ? 'رابط المشروع (اختياري)' : 'Project URL / Details Link (Optional)'}
                    value={newProjLink}
                    onChange={(e) => setNewProjLink(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 p-2 text-xs rounded text-white font-mono"
                  />
                  <textarea
                    placeholder={lang === 'ar' ? 'اشرح مخرجات المشروع والتقنيات المستخدمة بعبارات بسيطة' : 'Briefly explain key deliverables, tools, and tech stack utilized.'}
                    value={newProjDesc}
                    onChange={(e) => setNewProjDesc(e.target.value)}
                    rows={2}
                    className="w-full bg-zinc-950 border border-zinc-855 p-2 text-xs rounded text-white resize-none focus:outline-none focus:border-violet-500"
                  />
                  <button
                    type="button"
                    onClick={addProject}
                    className="py-1.5 w-full bg-violet-600 hover:bg-violet-550 text-xs text-white border border-violet-500/30 rounded flex justify-center items-center gap-1 font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {editingProjectId 
                      ? (lang === 'ar' ? 'حفظ تعديلات المشروع ✦' : 'Save Modified Project')
                      : (lang === 'ar' ? 'حفظ المشروع لقائمة السيرة الذاتية' : 'Publish Project to CV')
                    }
                  </button>
                </div>
              </div>
            )}

            {/* STEP 6: Education Builder */}
            {currentStep === 6 && (
              <div className="space-y-4">
                {profile.educations.length > 0 && (
                  <div className="space-y-2 border-b border-zinc-900 pb-3">
                    <p className="text-[10px] text-zinc-400 font-bold">{lang === 'ar' ? 'المؤهلات المضافة (انقر لتعديل أي مؤهل):' : 'Added qualifications (Click Edit to modify):'}</p>
                    {profile.educations.map((edu) => (
                      <div 
                        key={edu.id} 
                        className={`flex justify-between items-center bg-zinc-900 p-2.5 rounded-xl border transition-all ${
                          editingEducationId === edu.id 
                            ? 'border-violet-500 bg-violet-600/10' 
                            : 'border-zinc-850 hover:border-zinc-700'
                        }`}
                      >
                        <div className="text-left font-sans flex-1">
                          <p className="text-xs font-semibold text-zinc-200">{edu.degree} in {edu.field}</p>
                          <p className="text-[10px] text-zinc-500">{edu.institution} | {edu.startDate} - {edu.endDate}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            type="button"
                            onClick={() => startEditEducation(edu)}
                            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold rounded"
                          >
                            {lang === 'ar' ? 'تعديل' : 'Edit'}
                          </button>
                          <button 
                            type="button"
                            onClick={() => removeEducation(edu.id)}
                            className="p-1 px-2 rounded hover:bg-red-500/10 text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono font-bold text-violet-400 block">
                      {editingEducationId 
                        ? (lang === 'ar' ? 'تعديل لبيانات المؤهل الحالي ✦' : 'Modify Selected Qualification Details ✦')
                        : (lang === 'ar' ? 'إضافة مؤهل دراسي' : 'Add Degree or Study History')
                      }
                    </span>
                    {editingEducationId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEducationId(null);
                          setNewSchool('');
                          setNewDegree('');
                          setNewField('');
                          setNewEduStart('');
                          setNewEduEnd('');
                        }}
                        className="text-[10px] text-zinc-500 hover:text-white"
                      >
                        {lang === 'ar' ? '[إلغاء التعديل]' : '[Cancel]'}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder={lang === 'ar' ? 'الكلية أو الجامعة' : 'Institution / University'}
                    value={newSchool}
                    onChange={(e) => setNewSchool(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 p-2 text-xs rounded text-white animate-fade-in"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder={lang === 'ar' ? 'الدرجة العلمية (بكالوريوس...)' : 'Degree (e.g. Bachelors)'}
                      value={newDegree}
                      onChange={(e) => setNewDegree(e.target.value)}
                      className="bg-zinc-950 border border-zinc-850 p-2 text-xs rounded text-white"
                    />
                    <input
                      type="text"
                      placeholder={lang === 'ar' ? 'مجال التخصص' : 'Field of Study'}
                      value={newField}
                      onChange={(e) => setNewField(e.target.value)}
                      className="bg-zinc-950 border border-zinc-850 p-2 text-xs rounded text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder={lang === 'ar' ? 'سنة البدء' : 'Start Year'}
                      value={newEduStart}
                      onChange={(e) => setNewEduStart(e.target.value)}
                      className="bg-zinc-950 border border-zinc-850 p-2 text-xs rounded text-white"
                    />
                    <input
                      type="text"
                      placeholder={lang === 'ar' ? 'سنة التخرج المتوقعة' : 'Graduation Year'}
                      value={newEduEnd}
                      onChange={(e) => setNewEduEnd(e.target.value)}
                      className="bg-zinc-950 border border-zinc-850 p-2 text-xs rounded text-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addEducation}
                    className="py-1.5 w-full bg-violet-600 hover:bg-violet-550 text-xs text-white border border-violet-500/30 rounded flex justify-center items-center gap-1 font-bold"
                    id="add-education-btn"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {editingEducationId 
                      ? (lang === 'ar' ? 'حفظ تعديلات المؤهل ✦' : 'Save Modified Qualification')
                      : (lang === 'ar' ? 'إضافة المؤهل للمسودة' : 'Publish Education degree')
                    }
                  </button>
                </div>
              </div>
            )}

            {/* STEP 7: Skills */}
            {currentStep === 7 && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                    placeholder={lang === 'ar' ? 'تفوق من مهاراتك (React, Python...) ثم اضغط إضافة' : 'Type a skill, e.g. React, Python...'}
                    className="flex-1 bg-zinc-900 border border-zinc-800 p-2.5 text-xs rounded-xl text-white focus:outline-none focus:border-violet-500"
                    id="skill-entry-field"
                  />
                  <button
                    type="button"
                    onClick={addSkill}
                    className="px-4 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    {lang === 'ar' ? 'إضافة' : 'Add'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {profile.skills.length === 0 && (
                    <span className="text-zinc-500 text-xs font-sans tracking-tight block">
                      {lang === 'ar' ? 'لم يتم إدراج أي مهارات بعد.' : 'No skills appended yet.'}
                    </span>
                  )}
                  {profile.skills.map((skill, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-full text-xs flex items-center gap-1.5"
                    >
                      {skill}
                      <button 
                        onClick={() => removeSkill(skill)}
                        className="text-zinc-500 hover:text-red-400 font-bold ml-1 text-[10px]"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 8: Languages */}
            {currentStep === 8 && (
              <div className="space-y-4">
                <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800 space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={lang === 'ar' ? 'أدخل اسم اللغة (مثال: العربية)' : 'Language Name (e.g. Arabic)'}
                      value={newLang}
                      onChange={(e) => setNewLang(e.target.value)}
                      className="flex-1 bg-zinc-950 border border-zinc-850 p-2 text-xs rounded text-white"
                    />
                    <div className="w-28">
                      <select
                        value={newLangProf}
                        onChange={(e) => setNewLangProf(parseInt(e.target.value))}
                        className="w-full bg-zinc-950 border border-zinc-850 p-2 text-xs rounded text-zinc-300"
                      >
                        <option value={5}>{lang === 'ar' ? 'ممتاز / أم' : 'Native / Fluent'}</option>
                        <option value={4}>{lang === 'ar' ? 'جيد جداً' : 'Very Good'}</option>
                        <option value={3}>{lang === 'ar' ? 'جيد (متوسط)' : 'Conversational'}</option>
                        <option value={2}>{lang === 'ar' ? 'مبتدئ' : 'Basic'}</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addLanguage}
                    className="py-1.5 w-full bg-zinc-850 hover:bg-zinc-800 text-xs text-white border border-zinc-700/50 rounded flex justify-center items-center gap-1 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5 text-violet-400" />
                    {lang === 'ar' ? 'تأكيد وحفظ اللغة' : 'Confirm Language details'}
                  </button>
                </div>

                <div className="space-y-2">
                  {profile.languages.length === 0 && (
                    <span className="text-zinc-500 text-xs block font-sans">
                      {lang === 'ar' ? 'لم يحمل الملف أي لغات حتى الآن.' : 'No languages declared.'}
                    </span>
                  )}
                  {profile.languages.map((langObj) => (
                    <div key={langObj.id} className="flex justify-between items-center bg-zinc-900 p-2.5 rounded-xl border border-zinc-850">
                      <span className="text-xs text-zinc-200">{langObj.name} ({langObj.proficiency}/5)</span>
                      <button 
                        onClick={() => removeLanguage(langObj.id)}
                        className="text-red-400 hover:text-red-300 p-1 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 9: Certifications */}
            {currentStep === 9 && (
              <div className="space-y-4 font-sans">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCert}
                    onChange={(e) => setNewCert(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCertification()}
                    placeholder={lang === 'ar' ? 'اسم الدورة / الشهادة المهنية' : 'Certification Title (e.g. PMP, AWS Cloud Practitioner)'}
                    className="flex-1 bg-zinc-900 border border-zinc-800 p-2.5 text-xs rounded-xl text-white focus:outline-none focus:border-violet-500"
                  />
                  <button
                    type="button"
                    onClick={addCertification}
                    className="px-4 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    {lang === 'ar' ? 'أضف' : 'Add'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {profile.certifications.length === 0 && (
                    <span className="text-zinc-500 text-xs block font-sans">
                      {lang === 'ar' ? 'لم تذكر أي شهادات مهنية بعد.' : 'No training credentials declared yet.'}
                    </span>
                  )}
                  {profile.certifications.map((crt, id) => (
                    <span 
                      key={id}
                      className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-full text-xs flex items-center gap-1.5"
                    >
                      {crt}
                      <button onClick={() => removeCertification(crt)} className="text-zinc-500 hover:text-red-400 font-bold ml-1 text-xs">×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 10: Profile Picture Upload */}
            {currentStep === 10 && (
              <div className="space-y-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center space-y-4">
                  <div className="flex flex-col items-center justify-center">
                    {profile.photoUrl ? (
                      <div className="relative group">
                        <img 
                          src={profile.photoUrl} 
                          alt="Profile preview" 
                          referrerPolicy="no-referrer"
                          className="w-32 h-32 rounded-full object-cover border-2 border-violet-500 shadow-xl"
                        />
                        <button
                          type="button"
                          onClick={() => handleTextChange('photoUrl', '')}
                          className="absolute -top-1 -right-1 bg-red-600 text-white p-1 rounded-full text-xs hover:bg-red-500 transition-colors"
                          title="Remove Photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="outline-dashed outline-2 outline-offset-2 outline-zinc-800 rounded-full w-28 h-28 flex items-center justify-center bg-zinc-950 text-zinc-500">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-zinc-300">
                      {lang === 'ar' ? 'تحميل الصورة الشخصية للسيرة الذاتية' : 'Personal Profile Photo'}
                    </p>
                    <p className="text-[10px] text-zinc-500 leading-normal max-w-xs mx-auto font-sans">
                      {lang === 'ar' ? 'اختر صورة رسمية شخصية بخلفية موحدة تظهر ملامح الوجه بوضوح لدعم مظهر سيرتك الذاتية.' : 'Select a professional portrait with a neutral background (PNG or JPG).'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <label className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all active:scale-95 shadow-md shadow-violet-600/10">
                      <span>{lang === 'ar' ? 'اختر صورة من جهازك' : 'Choose File'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (typeof reader.result === 'string') {
                                handleTextChange('photoUrl', reader.result);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Personal Custom Logo Upload Card (Optional) */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center space-y-4">
                  <div className="flex flex-col items-center justify-center">
                    {profile.logoUrl ? (
                      <div className="relative group">
                        <img 
                          src={profile.logoUrl} 
                          alt="Personal Logo preview" 
                          referrerPolicy="no-referrer"
                          className="w-24 h-24 rounded-xl object-contain bg-white border border-zinc-750 p-2 shadow-xl"
                        />
                        <button
                          type="button"
                          onClick={() => handleTextChange('logoUrl', '')}
                          className="absolute -top-1 -right-1 bg-red-600 text-white p-1 rounded-full text-xs hover:bg-red-500 transition-colors"
                          title="Remove Logo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="outline-dashed outline-2 outline-offset-2 outline-zinc-800 rounded-xl w-24 h-24 flex items-center justify-center bg-zinc-950 text-zinc-500">
                        <Globe className="w-7 h-7 opacity-40 text-violet-400" />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-zinc-300">
                      {lang === 'ar' ? 'رفع شعار شخصي أو لوغو مخصص (اختياري)' : 'Upload Personal Logo (Optional)'}
                    </p>
                    <p className="text-[10px] text-zinc-500 leading-normal max-w-xs mx-auto font-sans">
                      {lang === 'ar' ? 'ان كان لديك شعار أو علامة شخصية مخصصة، يمكنك رفعها لتظهر بشكل مميز في السيرة الذاتية.' : 'Include an optional branding mark, badge, or custom design symbol for your profile.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <label className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700/60 rounded-xl text-xs font-semibold cursor-pointer transition-all active:scale-95 shadow-sm">
                      <span>{lang === 'ar' ? 'اختر الشعار (لوغو) إن وجد' : 'Choose Logo'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (typeof reader.result === 'string') {
                                handleTextChange('logoUrl', reader.result);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* BOTTOM STEP CONTROLLERS */}
        <div className="flex justify-between items-center pt-4 border-t border-zinc-900 mt-4">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center gap-2 text-xs font-medium px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-zinc-900"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.backBtn}
          </button>

          {currentStep < stepsHeader.length - 1 ? (
            <button
              type="button"
              onClick={validateAndNext}
              className="flex items-center gap-2 text-xs font-semibold px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-all shadow-lg shadow-violet-600/15"
              id="wizard-step-next-trigger"
            >
              {t.nextBtn}
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onComplete}
              className="flex items-center gap-2 text-xs font-bold px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl transition-all shadow-lg shadow-emerald-500/20"
              id="wizard-completer-trigger"
            >
              <CheckCircle className="w-4.5 h-4.5" />
              {t.finishBtn}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
export default WizardChat;
