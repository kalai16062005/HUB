import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlaskConical,
  ShieldCheck,
  Link as LinkIcon,
  Rocket,
  Send,
  Eraser,
  Info,
  MonitorPlay,
  Terminal,
  UserRound,
  GraduationCap,
  Hash,
  Fingerprint,
  Radio,
  Layers3,
  ExternalLink,
  FileCode2,
} from 'lucide-react';

const LAB_OPTIONS = [
  'hardware',
  'binary',
  'algorithm',
  'data',
  'safety',
  'caregiver',
  'circuit',
  'abacus',
  'bughunter',
  'punchcard',
  'pattern',
  'teachtoy',
  'network',
  'canvas',
  'shapeshifter',
];

const INITIAL_FORM = {
  labBaseUrl: 'http://localhost:3000',
  labId: 'binary',
  userId: 'student_123',
  studentName: 'Aarav',
  mode: 'preview',
  grade: '1',
  levelValue: '1',
  attemptId: 'attempt_456',
  sessionId: 'session_789',
};

const fieldCardStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  backgroundColor: 'rgba(255, 255, 255, 0.78)',
  color: 'var(--text-main)',
  border: '1px solid var(--border-color)',
  borderRadius: '10px',
  outline: 'none',
  fontSize: '0.94rem',
};

const getGridStyle = (columns) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
  gap: '16px',
});

function IframePayloadTester() {
  const iframeRef = useRef(null);
  const formRef = useRef(INITIAL_FORM);
  const [form, setForm] = useState(INITIAL_FORM);
  const [eventLog, setEventLog] = useState('');
  const [handshakeStatus, setHandshakeStatus] = useState('Waiting for iframe');
  const [loadedUrl, setLoadedUrl] = useState('');

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const embedUrlPreview = useMemo(() => {
    const baseUrl = form.labBaseUrl.replace(/\/+$/, '');
    return `${baseUrl}/labs/${form.labId}`;
  }, [form.labBaseUrl, form.labId]);

  const appendLog = useCallback((label, payload) => {
    const time = new Date().toLocaleTimeString();
    const block = `[${time}] ${label}\n${JSON.stringify(payload, null, 2)}\n\n`;
    setEventLog((current) => block + current);
  }, []);

  const buildInitPayload = useCallback((source = form) => ({
    type: 'lmsInit',
    data: {
      userId: source.userId,
      studentName: source.studentName,
      grade: Number(source.grade || 1),
      levelValue: Number(source.levelValue || 1),
      mode: source.mode,
      attemptId: source.attemptId,
      sessionId: source.sessionId,
      labId: source.labId,
    },
  }), [form]);

  const loadIframe = useCallback(() => {
    if (!iframeRef.current) {
      return;
    }

    iframeRef.current.src = embedUrlPreview;
    setLoadedUrl(embedUrlPreview);
    setHandshakeStatus('Iframe loading');
    appendLog('iframeLoaded', { src: embedUrlPreview });
  }, [appendLog, embedUrlPreview]);

  const sendInit = useCallback((source = formRef.current || form) => {
    if (!iframeRef.current?.contentWindow) {
      appendLog('sendInitSkipped', { reason: 'iframe not ready' });
      setHandshakeStatus('Iframe not ready');
      return;
    }

    const payload = buildInitPayload(source);
    iframeRef.current.contentWindow.postMessage(payload, '*');
    appendLog('parentSent lmsInit', payload);
    setHandshakeStatus('lmsInit sent');
  }, [appendLog, buildInitPayload, form]);

  useEffect(() => {
    const handleMessage = (event) => {
      appendLog('parentReceived message', {
        origin: event.origin,
        data: event.data,
      });

      if (event.data && event.data.type === 'labReady') {
        setHandshakeStatus('labReady received');
        sendInit(formRef.current);
        return;
      }

      if (event.data && event.data.type === 'levelComplete') {
        setHandshakeStatus('levelComplete received');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [sendInit, appendLog]);

  useEffect(() => {
    loadIframe();
    // Load the initial lab automatically when the tester opens.
  }, [loadIframe]);

  const updateField = (key) => (event) => {
    setForm((current) => ({
      ...current,
      [key]: event.target.value,
    }));
  };

  const renderFieldLabel = (Icon, text) => (
    <span
      style={{
        fontSize: '0.82rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: 'var(--text-main)',
      }}
    >
      <Icon size={14} />
      {text}
    </span>
  );

  return (
    <main
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        background:
          'radial-gradient(circle at top right, rgba(37, 99, 235, 0.10), transparent 30%), linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minHeight: '100%' }}>
        <section
          className="glass"
          style={{
            padding: '28px',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '24px',
            flexWrap: 'wrap',
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.92), rgba(240,247,255,0.82))',
          }}
        >
          <div style={{ maxWidth: '760px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                width: 'fit-content',
                padding: '8px 14px',
                borderRadius: '999px',
                backgroundColor: 'rgba(37, 99, 235, 0.10)',
                color: 'var(--primary)',
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <ShieldCheck size={14} />
              Hub Labs Testing Utility
            </div>
            <div>
              <h1 style={{ fontSize: '2.4rem', marginBottom: '10px' }}>Hub Iframe Test</h1>
              <p style={{ color: 'var(--text-dim)', maxWidth: '60ch', fontSize: '1rem' }}>
                A private iframe payload tester embedded directly into your hub for LMS
                parent-to-iframe messaging validation.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {[
                { icon: MonitorPlay, text: 'iframe ready' },
                { icon: Send, text: 'postMessage flow' },
                { icon: Terminal, text: 'live event log' },
              ].map(({ icon, text }) => {
                const IconComponent = icon;
                return (
                <div
                  key={text}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    borderRadius: '999px',
                    backgroundColor: 'rgba(255, 255, 255, 0.78)',
                    border: '1px solid rgba(37, 99, 235, 0.12)',
                    color: 'var(--text-main)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                  }}
                >
                  <IconComponent size={14} color="var(--primary)" />
                  {text}
                </div>
            );
          })}
            </div>
          </div>

          <div style={{ display: 'grid', gap: '14px', minWidth: '280px', flex: '1 1 280px', maxWidth: '360px' }}>
            <div className="glass" style={{ padding: '18px', backgroundColor: 'rgba(255,255,255,0.76)' }}>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                Parent Origin
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', wordBreak: 'break-all' }}>
                {window.location.origin}
              </div>
            </div>
            <div className="glass" style={{ padding: '18px', backgroundColor: 'rgba(255,255,255,0.76)' }}>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                Handshake Status
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>
                {handshakeStatus}
              </div>
            </div>
          </div>
        </section>

        <div
          className="iframe-tester-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(340px, 1.1fr) minmax(420px, 1.2fr)',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          <section className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                  Configuration
                </p>
                <h2 style={{ fontSize: '1.5rem' }}>Iframe Control Center</h2>
              </div>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(37, 99, 235, 0.10)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FlaskConical size={20} color="var(--primary)" />
              </div>
            </div>

            <div className="iframe-tester-fields-2" style={getGridStyle(2)}>
              <label style={fieldCardStyle}>
                {renderFieldLabel(LinkIcon, 'Lab App URL')}
                <input value={form.labBaseUrl} onChange={updateField('labBaseUrl')} style={inputStyle} />
              </label>
              <label style={fieldCardStyle}>
                {renderFieldLabel(FlaskConical, 'Lab Route')}
                <select value={form.labId} onChange={updateField('labId')} style={inputStyle}>
                  {LAB_OPTIONS.map((lab) => (
                    <option key={lab} value={lab}>
                      {lab}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="iframe-tester-fields-3" style={getGridStyle(3)}>
              <label style={fieldCardStyle}>
                {renderFieldLabel(FileCode2, 'User ID')}
                <input value={form.userId} onChange={updateField('userId')} style={inputStyle} />
              </label>
              <label style={fieldCardStyle}>
                {renderFieldLabel(UserRound, 'Student Name')}
                <input value={form.studentName} onChange={updateField('studentName')} style={inputStyle} />
              </label>
              <label style={fieldCardStyle}>
                {renderFieldLabel(Radio, 'Mode')}
                <input value={form.mode} onChange={updateField('mode')} style={inputStyle} />
              </label>
            </div>

            <div className="iframe-tester-fields-3" style={getGridStyle(3)}>
              <label style={fieldCardStyle}>
                {renderFieldLabel(GraduationCap, 'Grade')}
                <input type="number" value={form.grade} onChange={updateField('grade')} style={inputStyle} />
              </label>
              <label style={fieldCardStyle}>
                {renderFieldLabel(Layers3, 'Level Value')}
                <input type="number" value={form.levelValue} onChange={updateField('levelValue')} style={inputStyle} />
              </label>
              <label style={fieldCardStyle}>
                {renderFieldLabel(Hash, 'Attempt ID')}
                <input value={form.attemptId} onChange={updateField('attemptId')} style={inputStyle} />
              </label>
            </div>

            <div className="iframe-tester-fields-2" style={getGridStyle(2)}>
              <label style={fieldCardStyle}>
                {renderFieldLabel(Fingerprint, 'Session ID')}
                <input value={form.sessionId} onChange={updateField('sessionId')} style={inputStyle} />
              </label>
              <label style={fieldCardStyle}>
                {renderFieldLabel(ExternalLink, 'Embed URL Preview')}
                <input value={embedUrlPreview} readOnly style={{ ...inputStyle, color: 'var(--primary)', fontWeight: 600 }} />
              </label>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={loadIframe}
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--primary)',
                  color: '#fff',
                  borderRadius: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontWeight: 700,
                }}
              >
                <Rocket size={16} />
                Load Lab Iframe
              </button>
              <button
                onClick={sendInit}
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'rgba(37, 99, 235, 0.10)',
                  color: 'var(--primary)',
                  borderRadius: '10px',
                  border: '1px solid rgba(37, 99, 235, 0.18)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontWeight: 700,
                }}
              >
                <Send size={16} />
                Send lmsInit
              </button>
              <button
                onClick={() => setEventLog('')}
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-dim)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontWeight: 700,
                }}
              >
                <Eraser size={16} />
                Clear Log
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '14px 16px',
                borderRadius: '12px',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                border: '1px solid rgba(37, 99, 235, 0.12)',
                color: 'var(--text-main)',
              }}
            >
              <Info size={16} color="var(--primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
              <p style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>
                The tester automatically sends <code>lmsInit</code> after it receives
                <code style={{ marginLeft: '4px' }}>labReady</code> from the iframe.
              </p>
            </div>
          </section>

          <div style={{ display: 'grid', gap: '24px' }}>
            <section className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                    Preview
                  </p>
                  <h2 style={{ fontSize: '1.5rem' }}>Live Iframe Window</h2>
                </div>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '14px',
                    backgroundColor: 'rgba(37, 99, 235, 0.10)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MonitorPlay size={20} color="var(--primary)" />
                </div>
              </div>

              <div
                style={{
                  borderRadius: '18px',
                  overflow: 'hidden',
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                  backgroundColor: '#dbeafe',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '14px 16px',
                    backgroundColor: 'rgba(15, 23, 42, 0.94)',
                    color: '#e2e8f0',
                  }}
                >
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                  <span style={{ marginLeft: '6px', fontSize: '0.84rem', opacity: 0.88, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {loadedUrl || 'No lab loaded yet'}
                  </span>
                </div>
                <iframe
                  ref={iframeRef}
                  title="Hub Grade 1 Lab Test Frame"
                  style={{
                    display: 'block',
                    width: '100%',
                    minHeight: '520px',
                    border: 'none',
                    backgroundColor: '#fff',
                  }}
                />
              </div>
            </section>

            <section className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                    Diagnostics
                  </p>
                  <h2 style={{ fontSize: '1.5rem' }}>Event Console</h2>
                </div>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '14px',
                    backgroundColor: 'rgba(37, 99, 235, 0.10)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Terminal size={20} color="var(--primary)" />
                </div>
              </div>
              <textarea
                value={eventLog}
                readOnly
                style={{
                  width: '100%',
                  minHeight: '280px',
                  resize: 'vertical',
                  padding: '16px',
                  borderRadius: '14px',
                  border: '1px solid rgba(15, 23, 42, 0.12)',
                  backgroundColor: '#0f172a',
                  color: '#cbd5e1',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '0.84rem',
                  lineHeight: 1.6,
                  outline: 'none',
                }}
              />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

export default IframePayloadTester;
