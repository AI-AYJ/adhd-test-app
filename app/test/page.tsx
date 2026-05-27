'use client';
import { useState } from 'react';

export default function TestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTestClick = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inattention_count: Math.floor(Math.random() * 10),
          hyperactivity_count: Math.floor(Math.random() * 10),
          cpt_attention: Math.floor(Math.random() * 100),
          cpt_timeliness: Math.floor(Math.random() * 100),
          cpt_impulsivity: Math.floor(Math.random() * 100),
          cpt_hyperactivity: Math.floor(Math.random() * 100),
          gaze_off_task_ratio: Math.floor(Math.random() * 100),
          head_movement_variability: (Math.random() * 2).toFixed(2),
          final_risk_level: '웹 테스트',
          report: '직접 테스트 실행',
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>📊 DB 저장 테스트</h1>
      
      <button
        onClick={handleTestClick}
        disabled={loading}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: '#0066cc',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? '저장 중...' : '테스트 데이터 저장'}
      </button>

      {error && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          color: '#c33',
        }}>
          <strong>❌ 오류:</strong> {error}
        </div>
      )}

      {result && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#efe',
          border: '1px solid #cfc',
          borderRadius: '8px',
          color: '#363',
        }}>
          <strong>✅ 성공!</strong>
          <pre style={{
            marginTop: '10px',
            backgroundColor: '#f5f5f5',
            padding: '10px',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '12px',
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
          <p style={{ marginTop: '10px', fontSize: '14px' }}>
            <strong>저장된 ID:</strong> <code>{result.data?.[0]?.id}</code>
          </p>
          <p style={{ fontSize: '14px' }}>
            <strong>저장 시간:</strong> {result.data?.[0]?.created_at}
          </p>
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
        <h3>📝 사용 방법:</h3>
        <ol>
          <li><strong>"테스트 데이터 저장"</strong> 버튼을 클릭</li>
          <li>자동으로 생성된 랜덤 데이터가 DB에 저장됨</li>
          <li>매번 다른 ID로 저장됨</li>
          <li>응답에서 ID와 저장 시간 확인 가능</li>
        </ol>
      </div>

      <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#e8f4f8', borderRadius: '8px' }}>
        <h3>🔍 저장된 모든 데이터 조회:</h3>
        <a 
          href="/api/analyze"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            marginTop: '10px',
            padding: '8px 16px',
            backgroundColor: '#0066cc',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
          }}
        >
          GET /api/analyze →
        </a>
      </div>
    </div>
  );
}
