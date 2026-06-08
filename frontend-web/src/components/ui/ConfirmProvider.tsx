import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import Button from './Button';
import Modal from './Modal';

export interface ConfirmOptions {
  title?: string;
  message?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

interface State {
  opts: ConfirmOptions;
  resolve: (v: boolean) => void;
}

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Diálogo de confirmación reutilizable y bonito (reemplaza window.confirm).
 * Uso: `const confirm = useConfirm(); if (await confirm({ ... })) { ... }`.
 * Resuelve `true` al confirmar y `false` al cancelar / cerrar.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (opts) => new Promise<boolean>((resolve) => setState({ opts, resolve })),
    [],
  );

  const cerrar = (resultado: boolean) => {
    state?.resolve(resultado);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <Modal
          open
          onClose={() => cerrar(false)}
          title={state.opts.title ?? 'Confirmar'}
          maxWidth="sm">
          <div className="text-sm text-text-muted">{state.opts.message ?? '¿Seguro?'}</div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" onClick={() => cerrar(false)}>
              {state.opts.cancelText ?? 'Cancelar'}
            </Button>
            <Button
              variant={state.opts.danger ? 'danger' : 'primary'}
              onClick={() => cerrar(true)}>
              {state.opts.confirmText ?? 'Confirmar'}
            </Button>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>');
  return ctx;
}
