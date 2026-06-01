import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FFlowModule,
  FCreateNodeEvent,
  FCreateConnectionEvent,
} from '@foblex/flow';
import { GetCampaignUseCase }     from '../../../application/use-cases/campaigns/get-campaign.use-case';
import { SaveCanvasUseCase }      from '../../../application/use-cases/campaigns/save-canvas.use-case';
import { ResolveAudienceUseCase } from '../../../application/use-cases/segments/resolve-audience.use-case';
import { FilterBuilderComponent } from '../../../shared/components/filter-builder/filter-builder.component';
import type {
  Campaign,
  CanvasNode,
  CanvasEdge,
  SegmentNodeConfig,
  SmsNodeConfig,
} from '../../../domain/models/campaign.model';
import type { FilterGroup }    from '../../../domain/models/filter-tree.model';
import type { AudienceResult } from '../../../domain/models/audience.model';

type PaletteItem = { type: 'segment' | 'sms'; label: string; icon: string };

const PALETA: PaletteItem[] = [
  { type: 'segment', label: 'Segmento', icon: 'S' },
  { type: 'sms',     label: 'SMS',       icon: 'M' },
];

@Component({
  selector: 'app-campaign-editor',
  imports: [FFlowModule, FilterBuilderComponent],
  templateUrl: './campaign-editor.component.html',
  styleUrl: './campaign-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignEditorComponent implements OnInit {
  private readonly route           = inject(ActivatedRoute);
  private readonly router          = inject(Router);
  private readonly getUseCase      = inject(GetCampaignUseCase);
  private readonly saveUseCase     = inject(SaveCanvasUseCase);
  private readonly audienceUseCase = inject(ResolveAudienceUseCase);

  readonly campania          = signal<Campaign | null>(null);
  readonly nodos             = signal<CanvasNode[]>([]);
  readonly aristas           = signal<CanvasEdge[]>([]);
  readonly nodoActivo        = signal<CanvasNode | null>(null);
  readonly guardando         = signal(false);
  readonly error             = signal<string | null>(null);
  readonly exito             = signal<string | null>(null);
  readonly audiencia         = signal<AudienceResult | null>(null);
  readonly cargandoAudiencia = signal(false);

  readonly paleta = PALETA;
  private nextId = 1;

  // Map plano (no signal) para posiciones — evita disparar change detection durante el drag
  private readonly posiciones = new Map<string, { x: number; y: number }>();

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    try {
      const camp = await this.getUseCase.ejecutar(id);
      this.campania.set(camp);
      if (camp.canvas) {
        const nodos = camp.canvas.nodes ?? [];
        nodos.forEach(n => this.posiciones.set(n.id, { x: n.x, y: n.y }));
        this.nodos.set(nodos);
        this.aristas.set(camp.canvas.edges ?? []);
        this.nextId = nodos.length + 1;
      }
    } catch {
      this.error.set('No se pudo cargar la campaña');
    }
  }

  getPosicion(nodo: CanvasNode): { x: number; y: number } {
    return this.posiciones.get(nodo.id) ?? { x: nodo.x, y: nodo.y };
  }

  onCrearNodo(evento: FCreateNodeEvent<PaletteItem>): void {
    if (!evento.data) return;
    const id  = `node-${this.nextId++}`;
    const pos = evento.dropPosition ?? { x: 200, y: 200 };
    const config: SegmentNodeConfig | SmsNodeConfig =
      evento.data.type === 'segment'
        ? { filters: { op: 'AND', conditions: [] } }
        : { message: '' };

    this.posiciones.set(id, pos);
    this.nodos.update(n => [
      ...n,
      { id, type: evento.data.type, x: pos.x, y: pos.y, config },
    ]);
  }

  // Solo actualiza el Map plano — sin signal → sin change detection → sin resetear posición
  onPosicionCambiada(nodeId: string, pos: { x: number; y: number }): void {
    if (!nodeId || !pos || typeof pos.x !== 'number' || typeof pos.y !== 'number'
        || isNaN(pos.x) || isNaN(pos.y)) return;
    this.posiciones.set(nodeId, pos);
  }

  onCrearConexion(evento: FCreateConnectionEvent): void {
    if (!evento.targetId) return;
    const sourceId = evento.sourceId.replace('_out', '');
    const targetId = evento.targetId.replace('_in', '');
    if (sourceId === targetId) return;
    const existe = this.aristas().some(
      a => a.source === sourceId && a.target === targetId,
    );
    if (!existe) {
      this.aristas.update(a => [...a, { source: sourceId, target: targetId }]);
    }
  }

  seleccionarNodo(nodo: CanvasNode): void {
    this.nodoActivo.set(this.nodoActivo()?.id === nodo.id ? null : nodo);
    this.audiencia.set(null);
  }

  actualizarConfig(config: SegmentNodeConfig | SmsNodeConfig): void {
    const activo = this.nodoActivo();
    if (!activo) return;
    const actualizado = { ...activo, config };
    this.nodoActivo.set(actualizado);
    this.nodos.update(n => n.map(nd => nd.id === activo.id ? actualizado : nd));
  }

  actualizarFiltros(filtros: FilterGroup): void {
    this.actualizarConfig({ filters: filtros } as SegmentNodeConfig);
  }

  actualizarMensaje(mensaje: string): void {
    this.actualizarConfig({ message: mensaje } as SmsNodeConfig);
  }

  async previewAudiencia(): Promise<void> {
    const nodo = this.nodoActivo();
    if (!nodo || nodo.type !== 'segment') return;
    const filtros = (nodo.config as SegmentNodeConfig).filters;
    if (!filtros || filtros.conditions.length === 0) return;
    this.cargandoAudiencia.set(true);
    try {
      this.audiencia.set(await this.audienceUseCase.ejecutar(nodo.id, filtros));
    } catch {
      this.error.set('Error al resolver audiencia');
    } finally {
      this.cargandoAudiencia.set(false);
    }
  }

  async guardar(): Promise<void> {
    const camp = this.campania();
    if (!camp) return;
    this.guardando.set(true);
    this.error.set(null);
    try {
      // Sincroniza posiciones y filtra nodos inválidos antes de guardar
      const nodosActualizados = this.nodos()
        .filter(n => n.id && n.config)
        .map(n => {
          const pos = this.posiciones.get(n.id);
          return (pos && !isNaN(pos.x) && !isNaN(pos.y))
            ? { ...n, x: pos.x, y: pos.y }
            : n;
        });
      await this.saveUseCase.ejecutar(camp.id, {
        nodes: nodosActualizados,
        edges: this.aristas(),
      });
      this.exito.set('Canvas guardado correctamente');
      setTimeout(() => this.exito.set(null), 3000);
    } catch {
      this.error.set('Error al guardar el canvas');
    } finally {
      this.guardando.set(false);
    }
  }

  volver(): void {
    this.router.navigate(['/campaigns']);
  }

  iniciarResize(event: MouseEvent, panel: HTMLElement): void {
    event.preventDefault();
    const startX   = event.clientX;
    const startW   = panel.offsetWidth;
    const onMove   = (e: MouseEvent) => {
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

  segmentConfig(nodo: CanvasNode): SegmentNodeConfig {
    return (nodo.config ?? { filters: { op: 'AND', conditions: [] } }) as SegmentNodeConfig;
  }

  smsConfig(nodo: CanvasNode): SmsNodeConfig {
    return (nodo.config ?? { message: '' }) as SmsNodeConfig;
  }

  get contadorSms(): string {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'sms') return '';
    const msg     = (activo.config as SmsNodeConfig).message ?? '';
    const unicode = /[^\x00-\x7F]/.test(msg);
    return `${msg.length}/${unicode ? 70 : 160} ${unicode ? '(Unicode)' : '(GSM)'}`;
  }

  truncar(msg: string | undefined): string {
    if (!msg) return 'Sin mensaje';
    return msg.length > 30 ? msg.slice(0, 30) + '...' : msg;
  }

  get superaLimiteSms(): boolean {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'sms') return false;
    const msg = (activo.config as SmsNodeConfig).message ?? '';
    return msg.length > (/[^\x00-\x7F]/.test(msg) ? 70 : 160);
  }
}
