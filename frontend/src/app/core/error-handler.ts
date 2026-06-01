import { ErrorHandler, Injectable } from '@angular/core';

// Errores internos de @foblex/flow que no afectan la funcionalidad
const ERRORES_IGNORADOS = ['Unknown container'];

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    const msg = error instanceof Error ? error.message : String(error);

    if (ERRORES_IGNORADOS.some(e => msg.includes(e))) {
      console.warn('[foblex/flow interno]', msg);
      return;
    }

    console.error('[GlobalErrorHandler]', error);

    const div = document.createElement('div');
    div.style.cssText = `
      position:fixed; top:0; left:0; right:0; background:#c62828; color:#fff;
      padding:12px 16px; font-size:13px; z-index:9999; white-space:pre-wrap;
      max-height:200px; overflow:auto; cursor:pointer;
    `;
    div.textContent = `Error: ${msg} (click para cerrar)`;
    div.onclick = () => div.remove();
    document.body.appendChild(div);
  }
}
