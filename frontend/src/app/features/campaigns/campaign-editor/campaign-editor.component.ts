import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FFlowModule,
  FCreateNodeEvent,
  FCreateConnectionEvent,
  FMoveNodesEvent,
} from '@foblex/flow';
import { GetCampaignUseCase } from '../../../application/use-cases/campaigns/get-campaign.use-case';
import { SaveCanvasUseCase } from '../../../application/use-cases/campaigns/save-canvas.use-case';
import { ResolveAudienceUseCase } from '../../../application/use-cases/segments/resolve-audience.use-case';
import { FilterBuilderComponent } from '../../../shared/components/filter-builder/filter-builder.component';
import type {
  Campaign,
  CanvasNode,
  CanvasEdge,
  SegmentNodeConfig,
  SmsNodeConfig,
} from '../../../domain/models/campaign.model';
import type { FilterGroup } from '../../../domain/models/filter-tree.model';
import type { AudienceResult } from '../../../domain/models/audience.model';

type PaletteItem = { type: 'segment' | 'sms'; label: string; icon: string };

const PALETA: PaletteItem[] = [
  { type: 'segment', label: 'Segmento', icon: 'S' },
  { type: 'sms', label: 'SMS', icon: 'M' },
];

@Component({
  selector: 'app-campaign-editor',
  imports: [FFlowModule, FilterBuilderComponent],
  templateUrl: './campaign-editor.component.html',
  styleUrl: './campaign-editor.component.scss',
})
export class CampaignEditorComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly getUseCase = inject(GetCampaignUseCase);
  private readonly saveUseCase = inject(SaveCanvasUseCase);
  private readonly audienceUseCase = inject(ResolveAudienceUseCase);

  readonly campania = signal<Campaign | null>(null);
  readonly nodos = signal<CanvasNode[]>([]);
  readonly aristas = signal<CanvasEdge[]>([]);
  readonly nodoActivo = signal<CanvasNode | null>(null);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly audiencia = signal<AudienceResult | null>(null);
  readonly cargandoAudiencia = signal(false);

  readonly paleta = PALETA;
  private nextId = 1;

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    try {
      const camp = await this.getUseCase.ejecutar(id);
      this.campania.set(camp);
      if (camp.canvas) {
        this.nodos.set(camp.canvas.nodes ?? []);
        this.aristas.set(camp.canvas.edges ?? []);
        this.nextId = (camp.canvas.nodes?.length ?? 0) + 1;
      }
    } catch {
      this.error.set('No se pudo cargar la campaña');
    }
  }

  onCrearNodo(evento: FCreateNodeEvent<PaletteItem>): void {
    if (!evento.data) return;
    const id = `node-${this.nextId++}`;
    const pos = evento.dropPosition ?? { x: 200, y: 200 };
    const config: SegmentNodeConfig | SmsNodeConfig =
      evento.data.type === 'segment'
        ? { filters: { op: 'AND', conditions: [] } }
        : { message: '' };

    this.nodos.update((n) => [
      ...n,
      { id, type: evento.data.type, x: pos.x, y: pos.y, config },
    ]);
  }

  onMoverNodos(evento: FMoveNodesEvent): void {
    this.nodos.update((nodos) =>
      nodos.map((n) => {
        const movido = evento.nodes.find((m) => m.id === n.id);
        return movido ? { ...n, x: movido.position.x, y: movido.position.y } : n;
      }),
    );
  }

  onCrearConexion(evento: FCreateConnectionEvent): void {
    if (!evento.targetId) return;
    const sourceId = evento.sourceId.replace('_out', '');
    const targetId = evento.targetId.replace('_in', '');
    if (sourceId === targetId) return;
    const existe = this.aristas().some(
      (a) => a.source === sourceId && a.target === targetId,
    );
    if (!existe) {
      this.aristas.update((a) => [...a, { source: sourceId, target: targetId }]);
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
    this.nodos.update((n) => n.map((nd) => (nd.id === activo.id ? actualizado : nd)));
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
      await this.saveUseCase.ejecutar(camp.id, {
        nodes: this.nodos(),
        edges: this.aristas(),
      });
    } catch {
      this.error.set('Error al guardar el canvas');
    } finally {
      this.guardando.set(false);
    }
  }

  volver(): void {
    this.router.navigate(['/campaigns']);
  }

  segmentConfig(nodo: CanvasNode): SegmentNodeConfig {
    return nodo.config as SegmentNodeConfig;
  }

  smsConfig(nodo: CanvasNode): SmsNodeConfig {
    return nodo.config as SmsNodeConfig;
  }

  get contadorSms(): string {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'sms') return '';
    const msg = (activo.config as SmsNodeConfig).message ?? '';
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
