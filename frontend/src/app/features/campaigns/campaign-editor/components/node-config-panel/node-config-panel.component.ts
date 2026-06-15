import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { FFlowModule } from '@foblex/flow';
import { FilterBuilderComponent } from '../../../../../shared/components/filter-builder/filter-builder.component';
import { CanvasStateService } from '../../services/canvas-state.service';
import { SMS_VARIABLES } from '../../../../../domain/models/sms-variables.model';
import { ICONO_NODO, LABEL_NODO } from '../../../../../domain/models/campaign.model';
import type { WhatsappTipo } from '../../../../../domain/models/campaign.model';

const WP_TIPO_META: Record<WhatsappTipo, { label: string; icon: string; color: string; bgColor: string }> = {
  texto:     { label: 'WP Texto',      icon: '💬', color: '#1a8a47', bgColor: '#f0fdf4' },
  template:  { label: 'WP Template',   icon: '📋', color: '#7c3aed', bgColor: '#f5f3ff' },
  botones:   { label: 'WP Botones',    icon: '🔘', color: '#075e54', bgColor: '#ecfdf5' },
  lista:     { label: 'WP Lista',      icon: '📜', color: '#0369a1', bgColor: '#f0f9ff' },
  media:     { label: 'WP Media',      icon: '🖼',  color: '#b45309', bgColor: '#fffbeb' },
  ticket:    { label: 'WP Ticket',     icon: '🎫', color: '#b91c1c', bgColor: '#fff1f2' },
  condicion: { label: 'Condición',     icon: '⬦',  color: '#b45309', bgColor: '#fff7ed' },
};

@Component({
  selector: 'app-node-config-panel',
  standalone: true,
  imports: [FFlowModule, FilterBuilderComponent],
  templateUrl: './node-config-panel.component.html',
  styleUrl: './node-config-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NodeConfigPanelComponent {
  readonly state = inject(CanvasStateService);

  // ── Exposed signals (delegates) ───────────────────────────
  readonly nodoActivo              = this.state.nodoActivo;
  readonly audiencia               = this.state.audiencia;
  readonly cargandoAudiencia       = this.state.cargandoAudiencia;

  // ── Panel constants ───────────────────────────────────────
  readonly variablesDisponibles = SMS_VARIABLES;
  readonly wpTipoMeta           = WP_TIPO_META;
  readonly iconoNodo            = ICONO_NODO;
  readonly labelNodo            = LABEL_NODO;

  readonly wpTiposList: { value: WhatsappTipo; label: string; icon: string }[] = [
    { value: 'texto',     label: 'Texto',     icon: '💬' },
    { value: 'template',  label: 'Template',  icon: '📋' },
    { value: 'botones',   label: 'Botones',   icon: '🔘' },
    { value: 'lista',     label: 'Lista',     icon: '📜' },
    { value: 'media',     label: 'Media',     icon: '🖼'  },
    { value: 'condicion', label: 'Condición', icon: '⬦'  },
    { value: 'ticket',    label: 'Ticket',    icon: '🎫' },
  ];

  // ── Getters delegated to service ─────────────────────────
  get contadorSms(): string { return this.state.contadorSms; }
  get superaLimiteSms(): boolean { return this.state.superaLimiteSms; }

  // ── Config helpers ─────────────────────────────────────────
  segmentConfig  = (nodo: Parameters<typeof this.state.segmentConfig>[0])  => this.state.segmentConfig(nodo);
  smsConfig      = (nodo: Parameters<typeof this.state.smsConfig>[0])      => this.state.smsConfig(nodo);
  emailConfig    = (nodo: Parameters<typeof this.state.emailConfig>[0])    => this.state.emailConfig(nodo);
  whatsappConfig = (nodo: Parameters<typeof this.state.whatsappConfig>[0]) => this.state.whatsappConfig(nodo);

  // ── Mutation delegates ────────────────────────────────────
  actualizarNombre = (nombre: string) => this.state.actualizarNombre(nombre);
  actualizarFiltros = (filtros: Parameters<typeof this.state.actualizarFiltros>[0]) =>
    this.state.actualizarFiltros(filtros);
  previewAudiencia = () => this.state.previewAudiencia();

  actualizarSmsDeNodo = (
    nodo: Parameters<typeof this.state.actualizarSmsDeNodo>[0],
    message: string,
  ) => this.state.actualizarSmsDeNodo(nodo, message);

  insertarVariable = (token: string) => this.state.insertarVariable(token);
  previewMensaje   = (msg: string)   => this.state.previewMensaje(msg);

  actualizarEmailDeNodo = (
    nodo: Parameters<typeof this.state.actualizarEmailDeNodo>[0],
    campo: 'subject' | 'body',
    valor: string,
  ) => this.state.actualizarEmailDeNodo(nodo, campo, valor);

  actualizarTipoWpDeNodo = (
    nodo: Parameters<typeof this.state.actualizarTipoWpDeNodo>[0],
    tipo: WhatsappTipo,
  ) => this.state.actualizarTipoWpDeNodo(nodo, tipo);

  actualizarCampoWp = (
    nodo: Parameters<typeof this.state.actualizarCampoWp>[0],
    campo: Parameters<typeof this.state.actualizarCampoWp>[1],
    valor: unknown,
  ) => this.state.actualizarCampoWp(nodo, campo, valor);

  actualizarTextoBotonDeNodo = (
    nodo: Parameters<typeof this.state.actualizarTextoBotonDeNodo>[0],
    idx: number,
    texto: string,
  ) => this.state.actualizarTextoBotonDeNodo(nodo, idx, texto);

  eliminarBotonDeNodo = (
    nodo: Parameters<typeof this.state.eliminarBotonDeNodo>[0],
    idx: number,
  ) => this.state.eliminarBotonDeNodo(nodo, idx);

  asignarDestinoBranch = (
    nodo: Parameters<typeof this.state.asignarDestinoBranch>[0],
    condicion: string,
    targetId: string,
  ) => this.state.asignarDestinoBranch(nodo, condicion, targetId);

  targetDeRama = (
    nodo: Parameters<typeof this.state.targetDeRama>[0],
    condicion: string,
  ) => this.state.targetDeRama(nodo, condicion);

  nodosDisponibles = (nodoId: string) => this.state.nodosDisponibles(nodoId);
  etiquetaNodo     = (id: string)     => this.state.etiquetaNodo(id);

  agregarBotonDeNodo = (nodo: Parameters<typeof this.state.agregarBotonDeNodo>[0]) =>
    this.state.agregarBotonDeNodo(nodo);

  actualizarTituloOpcionDeNodo = (
    nodo: Parameters<typeof this.state.actualizarTituloOpcionDeNodo>[0],
    secIdx: number,
    optIdx: number,
    titulo: string,
  ) => this.state.actualizarTituloOpcionDeNodo(nodo, secIdx, optIdx, titulo);

  eliminarOpcionDeNodo = (
    nodo: Parameters<typeof this.state.eliminarOpcionDeNodo>[0],
    secIdx: number,
    optIdx: number,
  ) => this.state.eliminarOpcionDeNodo(nodo, secIdx, optIdx);

  agregarOpcionDeNodo = (nodo: Parameters<typeof this.state.agregarOpcionDeNodo>[0]) =>
    this.state.agregarOpcionDeNodo(nodo);

  actualizarTemplateParams = (raw: string) => this.state.actualizarTemplateParams(raw);

  eliminarNodo = (nodo: Parameters<typeof this.state.eliminarNodo>[0]) =>
    this.state.eliminarNodo(nodo);

  iniciarResize(event: MouseEvent, panel: HTMLElement): void {
    event.preventDefault();
    const startX = event.clientX;
    const startW = panel.offsetWidth;
    const onMove = (e: MouseEvent) => {
      const delta = startX - e.clientX;
      const w     = Math.max(280, Math.min(600, startW + delta));
      panel.style.width = `${w}px`;
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }
}
