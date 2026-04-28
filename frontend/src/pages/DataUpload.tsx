import React, { useRef, useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Users,
  FolderKanban,
  UserCheck,
  Download,
  AlertCircle,
  CheckCircle,
  Building2,
} from 'lucide-react';
import { apiService } from '../services/api';
import { showToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { withBasePath } from '../config/appBasePath';

type UploadType = 'personnel' | 'projects' | 'project-personnel' | 'teams' | 'users';
type TemplateFormat = 'csv' | 'xlsx';

interface UploadResult {
  success: number;
  failed: number;
  errors: string[];
}

const TEMPLATE_FILES: Record<UploadType, Record<TemplateFormat, string>> = {
  personnel: { csv: 'personnel_template.csv', xlsx: 'personnel_template.xlsx' },
  projects: { csv: 'projects_template.csv', xlsx: 'projects_template.xlsx' },
  'project-personnel': { csv: 'project-personnel_template.csv', xlsx: 'project-personnel_template.xlsx' },
  teams: { csv: 'teams_template.csv', xlsx: 'teams_template.xlsx' },
  users: { csv: 'users_template.csv', xlsx: 'users_template.xlsx' },
};

const t = {
  title: '\uB370\uC774\uD130 \uC5C5\uB85C\uB4DC',
  subtitle: 'Excel(.xlsx/.xls) \uB610\uB294 CSV \uD30C\uC77C\uB85C \uB370\uC774\uD130\uB97C \uC77C\uAD04 \uB4F1\uB85D\uD558\uAC70\uB098 \uC218\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
  personnel: '\uD300\uC6D0',
  projects: '\uC0AC\uC5C5',
  projectPersonnel: '\uCC38\uC5EC\uAD00\uACC4',
  teams: '\uD300',
  users: '\uC0AC\uC6A9\uC790',
  chooseFile: '\uC5C5\uB85C\uB4DC\uD560 \uD30C\uC77C\uC744 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.',
  invalidFile: 'Excel(.xlsx/.xls) \uB610\uB294 CSV \uD30C\uC77C\uB9CC \uC5C5\uB85C\uB4DC\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
  uploadFailed: '\uC5C5\uB85C\uB4DC \uCC98\uB9AC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.',
  uploading: '\uC5C5\uB85C\uB4DC \uC911...',
  upload: '\uC5C5\uB85C\uB4DC',
  result: '\uC5C5\uB85C\uB4DC \uACB0\uACFC',
  success: '\uAC74 \uC131\uACF5',
  failed: '\uAC74 \uC2E4\uD328',
  failItems: '\uC2E4\uD328 \uD56D\uBAA9',
  downloadCsv: 'CSV \uC0D8\uD50C',
  downloadXlsx: 'XLSX \uC0D8\uD50C',
  drag: '\uD30C\uC77C\uC744 \uB4DC\uB798\uADF8\uD558\uAC70\uB098 \uD074\uB9AD\uD574\uC11C \uC120\uD0DD',
  support: 'Excel(.xlsx/.xls) \uB610\uB294 CSV\uB9CC \uC9C0\uC6D0',
  grouped1: '\uAC19\uC740 \uC778\uB825\uACFC \uC0AC\uC5C5\uBA85 \uC870\uD569\uC73C\uB85C \uC5EC\uB7EC \uC904\uC744 \uC785\uB825\uD558\uBA74 \uD558\uB098\uC758 \uCC38\uC5EC\uC790 \uC544\uB798 \uC5EC\uB7EC \uCC38\uC5EC \uAD6C\uAC04\uC73C\uB85C \uC800\uC7A5\uB429\uB2C8\uB2E4.',
  grouped2: '\uC608: EMP001 + AI \uAE30\uC220\uAC1C\uBC1C 3\uC904 \uC785\uB825 \uC2DC 3\uAC1C \uC138\uADF8\uBA3C\uD2B8\uAC00 \uC0DD\uC131\uB429\uB2C8\uB2E4.',
  grouped3: '\uAC01 \uC904\uC758 startDate, endDate, participationRate\uAC00 \uAD6C\uAC04\uBCC4 \uAC12\uC73C\uB85C \uC801\uC6A9\uB429\uB2C8\uB2E4.',
};

export default function DataUpload() {
  const { hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState<UploadType>('personnel');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = hasRole(['ADMIN']);

  const tabs = [
    { key: 'personnel' as UploadType, label: t.personnel, icon: Users, description: '\uD300\uC6D0 \uC815\uBCF4\uB97C \uC77C\uAD04 \uB4F1\uB85D\uD558\uAC70\uB098 \uC218\uC815\uD569\uB2C8\uB2E4.' },
    { key: 'projects' as UploadType, label: t.projects, icon: FolderKanban, description: '\uC0AC\uC5C5 \uC815\uBCF4\uB97C \uC77C\uAD04 \uB4F1\uB85D\uD558\uAC70\uB098 \uC218\uC815\uD569\uB2C8\uB2E4.' },
    { key: 'project-personnel' as UploadType, label: t.projectPersonnel, icon: UserCheck, description: '\uAC19\uC740 \uC778\uB825\uACFC \uC0AC\uC5C5\uBA85 \uC870\uD569\uC744 \uC5EC\uB7EC \uC904\uB85C \uB123\uC73C\uBA74 \uAE30\uAC04\uBCC4 \uCC38\uC5EC \uAD6C\uAC04\uC73C\uB85C \uBB36\uC5EC \uC800\uC7A5\uB429\uB2C8\uB2E4.' },
    { key: 'teams' as UploadType, label: t.teams, icon: Building2, description: '\uD300 \uC815\uBCF4\uB97C \uC77C\uAD04 \uB4F1\uB85D\uD558\uAC70\uB098 \uC218\uC815\uD569\uB2C8\uB2E4.' },
    { key: 'users' as UploadType, label: t.users, icon: FileSpreadsheet, description: '\uC2DC\uC2A4\uD15C \uC0AC\uC6A9\uC790 \uACC4\uC815\uC744 \uC77C\uAD04 \uB4F1\uB85D\uD558\uAC70\uB098 \uC218\uC815\uD569\uB2C8\uB2E4.', adminOnly: true },
  ];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(extension || '')) {
      showToast('error', t.invalidFile);
      return;
    }
    setFile(selectedFile);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) {
      showToast('error', t.chooseFile);
      return;
    }
    setUploading(true);
    setResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const endpoints: Record<UploadType, string> = {
        personnel: '/upload/personnel',
        projects: '/upload/projects',
        'project-personnel': '/upload/project-personnel',
        teams: '/upload/teams',
        users: '/upload/users',
      };
      const response = await fetch(`${process.env.REACT_APP_API_URL || withBasePath('/api')}${endpoints[activeTab]}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiService.getToken()}` },
        body: formData,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: UploadResult = await response.json();
      setResult(data);
      if (data.failed > 0) {
        showToast('warning', `${t.result}: ${data.success}${t.success}, ${data.failed}${t.failed}`);
      } else {
        showToast('success', `${t.result}: ${data.success}\uAC74 \uCC98\uB9AC\uD588\uC2B5\uB2C8\uB2E4.`);
      }
    } catch {
      showToast('error', t.uploadFailed);
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = (type: UploadType, format: TemplateFormat) => {
    const filename = TEMPLATE_FILES[type][format];
    const link = document.createElement('a');
    link.href = withBasePath(`/templates/${filename}`);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || isAdmin);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a2e', marginBottom: '8px' }}>{t.title}</h1>
        <p style={{ color: '#666', fontSize: '14px' }}>{t.subtitle}</p>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setFile(null); setResult(null); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: isActive ? '#667eea' : 'white', color: isActive ? 'white' : '#333', border: `1px solid ${isActive ? '#667eea' : '#ddd'}`, borderRadius: '8px', cursor: 'pointer', fontWeight: isActive ? 600 : 400 }}>
              <Icon size={18} />{tab.label}
            </button>
          );
        })}
      </div>

      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600' }}>{visibleTabs.find((tab) => tab.key === activeTab)?.label} {t.upload}</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => downloadTemplate(activeTab, 'csv')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}><Download size={14} />{t.downloadCsv}</button>
            <button onClick={() => downloadTemplate(activeTab, 'xlsx')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}><Download size={14} />{t.downloadXlsx}</button>
          </div>
        </div>

        <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>{visibleTabs.find((tab) => tab.key === activeTab)?.description}</p>
        {activeTab === 'project-personnel' && (
          <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', fontSize: '12px', color: '#475569', marginBottom: '16px', lineHeight: 1.6 }}>
            <div>{t.grouped1}</div>
            <div>{t.grouped2}</div>
            <div>{t.grouped3}</div>
          </div>
        )}

        <div onClick={() => fileInputRef.current?.click()} style={{ border: '2px dashed #ddd', borderRadius: '8px', padding: '40px', textAlign: 'center', cursor: 'pointer', background: file ? '#f0f9ff' : '#fafafa' }}>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} style={{ display: 'none' }} />
          <Upload size={40} color={file ? '#667eea' : '#999'} style={{ marginBottom: '12px' }} />
          {file ? (
            <div><p style={{ fontWeight: 600, color: '#333', marginBottom: '4px' }}>{file.name}</p><p style={{ fontSize: '12px', color: '#666' }}>{(file.size / 1024).toFixed(1)} KB</p></div>
          ) : (
            <div><p style={{ fontWeight: 500, color: '#333', marginBottom: '4px' }}>{t.drag}</p><p style={{ fontSize: '12px', color: '#999' }}>{t.support}</p></div>
          )}
        </div>

        <button onClick={handleUpload} disabled={!file || uploading} style={{ width: '100%', marginTop: '16px', padding: '12px', background: !file || uploading ? '#ccc' : '#667eea', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: !file || uploading ? 'not-allowed' : 'pointer' }}>
          {uploading ? t.uploading : t.upload}
        </button>
      </div>

      {result && (
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>{t.result}</h3>
          <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={20} color="#10b981" /><span style={{ fontWeight: 600 }}>{result.success}{t.success}</span></div>
            {result.failed > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={20} color="#ef4444" /><span style={{ fontWeight: 600 }}>{result.failed}{t.failed}</span></div>}
          </div>
          {result.errors.length > 0 && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '12px', maxHeight: '200px', overflow: 'auto' }}>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#dc2626', marginBottom: '8px' }}>{t.failItems}</p>
              {result.errors.map((item, index) => <p key={index} style={{ fontSize: '12px', color: '#991b1b', marginBottom: '4px' }}>{item}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
