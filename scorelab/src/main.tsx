import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './state/auth';
import { CloudProvider } from './state/cloud';
import { Ambient, SettingsProvider } from './state/settings';
import { WorkspaceProvider } from './state/workspace';
import { ModalProvider } from './ui/ModalProvider';
import { ToastProvider } from './ui/Toast';

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/modal.css';
import './styles/app.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root 를 찾지 못했습니다.');

/*
 * 순서가 중요하다. 모달 내용은 ModalProvider 의 하위 트리에서 그려지므로,
 * 모달 안에서 쓰는 컨텍스트(설정·토스트·인증·워크스페이스·동기화)는 모두
 * ModalProvider 보다 바깥에 있어야 한다. App 만 가장 안쪽에 둔다.
 */
createRoot(root).render(
  <StrictMode>
    <SettingsProvider>
      <Ambient />
      <ToastProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <CloudProvider>
              <ModalProvider>
                <App />
              </ModalProvider>
            </CloudProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </ToastProvider>
    </SettingsProvider>
  </StrictMode>,
);
