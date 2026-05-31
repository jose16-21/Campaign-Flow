import { ErrorHandler, Injectable } from '@angular/core';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[GlobalErrorHandler]', error);

    // Mostrar error visible en pantalla para debug
    const div = document.createElement('div');
    div.style.cssText = `
      position:fixed; top:0; left:0; right:0; background:#c62828; color:#fff;
      padding:12px 16px; font-size:13px; z-index:9999; white-space:pre-wrap;
      max-height:200px; overflow:auto;
    `;
    div.textContent = `Error: ${msg}`;
    document.body.appendChild(div);
  }
}
