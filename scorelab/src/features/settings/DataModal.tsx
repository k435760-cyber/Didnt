/** 내보내기·가져오기·초기화. 파일 선택 실패나 클립보드 차단까지 모달 안에서 처리한다. */
import { useRef, useState } from 'react';
import { LIMITS, emptyWorkspace } from '../../lib/engine';
import {
  ImportError,
  mergeWorkspace,
  parseWorkspace,
  serialize,
  type MergeMode,
} from '../../lib/serialize';
import { readBackup } from '../../lib/storage';
import { ModalBody, ModalFoot, ModalHead } from '../../ui/Modal';
import { Icon } from '../../ui/Icon';
import { Segmented } from '../../ui/primitives';
import { useModal } from '../../ui/ModalProvider';
import { useToast } from '../../ui/Toast';
import { useWorkspace } from '../../state/workspace';

const fileName = () => `scorelab-${new Date().toISOString().slice(0, 10)}.json`;

function download(text: string, name: string) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DataModal({ onClose }: { onClose: () => void }) {
  const { workspace, replaceWorkspace } = useWorkspace();
  const modal = useModal();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<'export' | 'import'>('export');
  const [mode, setMode] = useState<MergeMode>('append');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const backup = readBackup();

  const json = serialize(workspace);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      toast.ok('클립보드에 복사했어요.');
    } catch {
      // 클립보드가 막힌 브라우저에서는 직접 고를 수 있게 본문을 보여 준다.
      await modal.alert({
        title: '복사할 수 없어요',
        description:
          '이 브라우저가 클립보드 접근을 막고 있어요. 아래 내용을 직접 선택해 복사해 주세요.',
        tone: 'warn',
        icon: 'alert',
        size: 'lg',
        body: (
          <textarea
            className="input"
            readOnly
            value={json}
            style={{ minHeight: 220, fontFamily: 'var(--font-num)', fontSize: 12 }}
          />
        ),
      });
    }
  };

  const applyImport = async (raw: string) => {
    setError(null);
    try {
      const incoming = parseWorkspace(raw);
      if (mode === 'replace') {
        const ok = await modal.confirm({
          title: '현재 데이터를 덮어쓸까요?',
          description: `이 기기의 과목 ${workspace.subjects.length}개가 불러온 ${incoming.subjects.length}개로 교체됩니다.`,
          confirmText: '덮어쓰기',
          destructive: true,
        });
        if (!ok) return;
      }
      const merged = mergeWorkspace(workspace, incoming, mode);
      replaceWorkspace(merged);
      toast.ok(
        mode === 'replace'
          ? `과목 ${incoming.subjects.length}개로 교체했어요.`
          : `과목 ${incoming.subjects.length}개를 추가했어요.`,
      );
      onClose();
    } catch (cause) {
      setError(cause instanceof ImportError ? cause.message : '파일을 읽지 못했어요.');
    }
  };

  const pickFile = async (file: File) => {
    if (file.size > LIMITS.fileBytes) {
      setError(`파일이 너무 큽니다. (${Math.round(LIMITS.fileBytes / 1024 / 1024)}MB 이하)`);
      return;
    }
    try {
      await applyImport(await file.text());
    } catch {
      setError('파일을 읽지 못했어요.');
    }
  };

  const resetAll = async () => {
    const ok = await modal.confirm({
      title: '모든 데이터를 지울까요?',
      description: '이 기기의 과목과 점수가 전부 삭제되고 예시 과목만 남습니다. 되돌릴 수 없어요.',
      confirmText: '전부 삭제',
      destructive: true,
    });
    if (!ok) return;
    replaceWorkspace(emptyWorkspace());
    toast.show('초기 상태로 되돌렸어요.');
    onClose();
  };

  return (
    <>
      <ModalHead
        title="데이터"
        description="JSON 파일로 백업하고 다른 기기로 옮길 수 있어요."
        icon="layers"
        onClose={onClose}
      />
      <ModalBody>
        <Segmented
          block
          label="데이터 작업"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'export', label: '내보내기' },
            { value: 'import', label: '가져오기' },
          ]}
        />

        {tab === 'export' ? (
          <>
            <p className="muted">
              과목 {workspace.subjects.length}개, 평가{' '}
              {workspace.subjects.reduce((sum, s) => sum + s.items.length, 0)}개 · 약{' '}
              {Math.max(1, Math.round(new Blob([json]).size / 1024))}KB
            </p>
            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={() => download(json, fileName())}
            >
              <Icon name="download" size={17} />
              JSON 파일로 저장
            </button>
            <button type="button" className="btn btn--block" onClick={() => void copy()}>
              <Icon name="copy" size={17} />
              클립보드에 복사
            </button>
            {backup && (
              <>
                <hr className="divider" />
                <div className="banner banner--warn">
                  <span className="banner__icon">
                    <Icon name="alert" size={16} />
                  </span>
                  <span className="banner__text">
                    예전에 읽지 못한 저장본이 남아 있어요. 내려받아 직접 살펴볼 수 있습니다.
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn--block"
                  onClick={() => download(backup, 'scorelab-손상된-백업.json')}
                >
                  <Icon name="download" size={17} />
                  손상된 원본 내려받기
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <Segmented
              block
              label="가져오기 방식"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'append', label: '기존에 추가' },
                { value: 'replace', label: '전부 교체' },
              ]}
            />
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void pickFile(file);
                event.target.value = '';
              }}
            />
            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={() => fileRef.current?.click()}
            >
              <Icon name="upload" size={17} />
              JSON 파일 선택
            </button>
            <label className="field">
              <span className="field__label">또는 내용 붙여넣기</span>
              <textarea
                className="input"
                value={text}
                placeholder='{ "format": "scorelab", ... }'
                style={{ minHeight: 140, fontFamily: 'var(--font-num)', fontSize: 12 }}
                onChange={(event) => {
                  setText(event.target.value);
                  setError(null);
                }}
              />
            </label>
            <button
              type="button"
              className="btn btn--block"
              disabled={!text.trim()}
              onClick={() => void applyImport(text)}
            >
              붙여넣은 내용 불러오기
            </button>
            {error && (
              <div className="banner banner--bad">
                <span className="banner__icon">
                  <Icon name="alert" size={16} />
                </span>
                <span className="banner__text">{error}</span>
              </div>
            )}
          </>
        )}

        <hr className="divider" />
        <button
          type="button"
          className="btn btn--danger btn--block"
          onClick={() => void resetAll()}
        >
          <Icon name="trash" size={17} />이 기기 데이터 초기화
        </button>
      </ModalBody>
      <ModalFoot align="end">
        <button type="button" className="btn" onClick={onClose}>
          닫기
        </button>
      </ModalFoot>
    </>
  );
}
