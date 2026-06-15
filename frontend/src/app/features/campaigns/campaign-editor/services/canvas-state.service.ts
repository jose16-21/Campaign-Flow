import { Injectable, inject, signal, computed } from '@angular/core';
import { ResolveAudienceUseCase } from '../../../../application/use-cases/segments/resolve-audience.use-case';
import type {
  CanvasNode,
  CanvasEdge,
  CanvasGroup,
  AnnotationNodeConfig,
  SegmentNodeConfig,
  SmsNodeConfig,
  EmailNodeConfig,
  WhatsappNodeConfig,
  WhatsappTipo,
  WhatsappSeccion,
  Canvas,
} from '../../../../domain/models/campaign.model';
import { TIPOS_ACCION, ICONO_NODO, LABEL_NODO } from '../../../../domain/models/campaign.model';
import type { FilterGroup } from '../../../../domain/models/filter-tree.model';
import type { AudienceResult } from '../../../../domain/models/audience.model';
import type { Contact } from '../../../../domain/models/contact.model';
import {
  resolverVariables,
  resolverVariablesEjemplo,
} from '../../../../domain/models/sms-variables.model';

@Injectable()
export class CanvasStateService {
  private readonly audienceUseCase = inject(ResolveAudienceUseCase);

  // ── Signals ──────────────────────────────────────────────
  readonly nodos                   = signal<CanvasNode[]>([]);
  readonly aristas                 = signal<CanvasEdge[]>([]);
  readonly grupos                  = signal<CanvasGroup[]>([]);
  readonly nodoActivo              = signal<CanvasNode | null>(null);
  readonly audiencia               = signal<AudienceResult | null>(null);
  readonly cargandoAudiencia       = signal(false);
  readonly conexionesSeleccionadas = signal<string[]>([]);
  readonly nodosConError           = signal<Set<string>>(new Set());

  // ── Computed ─────────────────────────────────────────────
  readonly nodosCanvas = computed(() => this.nodos().filter(n => n.type !== 'annotation'));
  readonly nodosNota   = computed(() => this.nodos().filter(n => n.type === 'annotation'));

  // ── ID counters ──────────────────────────────────────────
  private nextNodeId  = 1;
  private nextGroupId = 1;

  // ── Constants (exposed for panels) ───────────────────────
  readonly iconoNodo = ICONO_NODO;
  readonly labelNodo = LABEL_NODO;

  // ─────────────────────────────────────────────────────────
  // Initialisation
  // ─────────────────────────────────────────────────────────

  initialize(canvas: Canvas): void {
    const nodos = canvas.nodes ?? [];
    this.nodos.set(nodos);

    const aristasCargadas = (canvas.edges ?? [])
      .map(a => {
        const src = nodos.find(n => n.id === a.source);
        const tgt = nodos.find(n => n.id === a.target);
        const srcEsAccion   = src && TIPOS_ACCION.includes(src.type);
        const tgtEsSegmento = tgt?.type === 'segment';
        return (srcEsAccion && tgtEsSegmento)
          ? { source: a.target, target: a.source }
          : a;
      })
      .filter(a => {
        const src = nodos.find(n => n.id === a.source);
        if (src?.type === 'whatsapp') {
          const c = src.config as WhatsappNodeConfig;
          if ((c.tipo === 'botones' || c.tipo === 'lista') && !a.condicion) return false;
        }
        return true;
      });

    this.aristas.set(aristasCargadas);
    this.grupos.set(canvas.groups ?? []);
  }

  resetearNextId(maxIdx: number): void {
    this.nextNodeId = maxIdx + 1;
  }

  resetearNextGroupId(maxGIdx: number): void {
    this.nextGroupId = maxGIdx + 1;
  }

  generarIdNodo(): string {
    return `node-${this.nextNodeId++}`;
  }

  // ─────────────────────────────────────────────────────────
  // Nodo config helpers
  // ─────────────────────────────────────────────────────────

  segmentConfig(nodo: CanvasNode): SegmentNodeConfig {
    return (nodo.config ?? { filters: { op: 'AND', conditions: [] } }) as SegmentNodeConfig;
  }

  smsConfig(nodo: CanvasNode): SmsNodeConfig {
    return (nodo.config ?? { message: '' }) as SmsNodeConfig;
  }

  emailConfig(nodo: CanvasNode): EmailNodeConfig {
    return (nodo.config ?? { subject: '', body: '' }) as EmailNodeConfig;
  }

  whatsappConfig(nodo: CanvasNode): WhatsappNodeConfig {
    return (nodo.config ?? { tipo: 'texto', mensaje: '' }) as WhatsappNodeConfig;
  }

  annotationConfig(nodo: CanvasNode): AnnotationNodeConfig {
    return nodo.config as AnnotationNodeConfig;
  }

  // ─────────────────────────────────────────────────────────
  // Selección / eliminación
  // ─────────────────────────────────────────────────────────

  seleccionarNodo(nodo: CanvasNode): void {
    if (nodo.type === 'segment') {
      this.nodoActivo.set(this.nodoActivo()?.id === nodo.id ? null : nodo);
    } else {
      this.nodoActivo.set(nodo);
    }
    this.audiencia.set(null);
    this.conexionesSeleccionadas.set([]);
  }

  eliminarNodo(nodo: CanvasNode): void {
    this.nodos.update(ns => ns.filter(n => n.id !== nodo.id));
    this.aristas.update(as => as.filter(a => a.source !== nodo.id && a.target !== nodo.id));
    if (this.nodoActivo()?.id === nodo.id) {
      this.nodoActivo.set(null);
      this.audiencia.set(null);
    }
  }

  eliminarNodoActivo(): void {
    const activo = this.nodoActivo();
    if (!activo) return;
    this.nodos.update(ns => ns.filter(n => n.id !== activo.id));
    this.aristas.update(as => as.filter(
      a => a.source !== activo.id && a.target !== activo.id,
    ));
    this.nodoActivo.set(null);
    this.audiencia.set(null);
  }

  // ─────────────────────────────────────────────────────────
  // Actualizar config genérica
  // ─────────────────────────────────────────────────────────

  private actualizarNodoDirecto(
    nodo: CanvasNode,
    config: SegmentNodeConfig | SmsNodeConfig | EmailNodeConfig | WhatsappNodeConfig,
  ): void {
    const actualizado = { ...nodo, config };
    this.nodos.update(ns => ns.map(n => n.id === nodo.id ? actualizado : n));
    if (this.nodoActivo()?.id === nodo.id) this.nodoActivo.set(actualizado);
  }

  actualizarConfig(
    config: SegmentNodeConfig | SmsNodeConfig | EmailNodeConfig | WhatsappNodeConfig,
  ): void {
    const activo = this.nodoActivo();
    if (!activo) return;
    const actualizado = { ...activo, config };
    this.nodoActivo.set(actualizado);
    this.nodos.update(n => n.map(nd => nd.id === activo.id ? actualizado : nd));
  }

  actualizarNombre(nombre: string): void {
    const activo = this.nodoActivo();
    if (!activo) return;
    const actualizado = { ...activo, name: nombre.trim() || undefined };
    this.nodoActivo.set(actualizado);
    this.nodos.update(ns => ns.map(n => n.id === activo.id ? actualizado : n));
  }

  actualizarFiltros(filtros: FilterGroup): void {
    this.actualizarConfig({ filters: filtros } as SegmentNodeConfig);
  }

  actualizarMensaje(mensaje: string): void {
    this.actualizarConfig({ message: mensaje } as SmsNodeConfig);
  }

  // ─────────────────────────────────────────────────────────
  // Helpers directos (reciben el nodo como parámetro)
  // ─────────────────────────────────────────────────────────

  actualizarCampoWp(nodo: CanvasNode, campo: keyof WhatsappNodeConfig, valor: unknown): void {
    const c = this.whatsappConfig(nodo);
    this.actualizarNodoDirecto(nodo, { ...c, [campo]: valor } as WhatsappNodeConfig);
  }

  actualizarTextoBotonDeNodo(nodo: CanvasNode, idx: number, texto: string): void {
    const c       = this.whatsappConfig(nodo);
    const botones = (c.botones ?? []).map((b, i) => i === idx ? { ...b, texto } : b);
    const btnId   = c.botones?.[idx]?.id;
    if (btnId) {
      this.aristas.update(as => as.map(a =>
        a.source === nodo.id && a.condicion === btnId ? { ...a, etiqueta: texto } : a
      ));
    }
    this.actualizarCampoWp(nodo, 'botones', botones);
  }

  actualizarTituloOpcionDeNodo(nodo: CanvasNode, secIdx: number, optIdx: number, titulo: string): void {
    const c     = this.whatsappConfig(nodo);
    const optId = c.secciones?.[secIdx]?.opciones?.[optIdx]?.id;
    const secciones: WhatsappSeccion[] = (c.secciones ?? []).map((s, i) =>
      i === secIdx
        ? { ...s, opciones: s.opciones.map((o, j) => j === optIdx ? { ...o, titulo } : o) }
        : s
    );
    if (optId) {
      this.aristas.update(as => as.map(a =>
        a.source === nodo.id && a.condicion === optId ? { ...a, etiqueta: titulo } : a
      ));
    }
    this.actualizarCampoWp(nodo, 'secciones', secciones);
  }

  agregarBotonDeNodo(nodo: CanvasNode): void {
    const c       = this.whatsappConfig(nodo);
    const botones = [...(c.botones ?? [])];
    if (botones.length >= 3) return;
    botones.push({ id: `btn_${Date.now()}`, texto: '' });
    this.actualizarCampoWp(nodo, 'botones', botones);
  }

  eliminarBotonDeNodo(nodo: CanvasNode, idx: number): void {
    const c         = this.whatsappConfig(nodo);
    const eliminado = c.botones?.[idx];
    const botones   = (c.botones ?? []).filter((_, i) => i !== idx);
    if (eliminado) {
      this.aristas.update(as => as.filter(
        a => !(a.source === nodo.id && a.condicion === eliminado.id)
      ));
    }
    this.actualizarCampoWp(nodo, 'botones', botones);
  }

  agregarOpcionDeNodo(nodo: CanvasNode): void {
    const c = this.whatsappConfig(nodo);
    const secciones = (c.secciones ?? []).length
      ? (c.secciones ?? []).map((s, i) =>
          i === 0 ? { ...s, opciones: [...s.opciones, { id: `opt_${Date.now()}`, titulo: '' }] } : s
        )
      : [{ titulo: '', opciones: [{ id: `opt_${Date.now()}`, titulo: '' }] }];
    this.actualizarCampoWp(nodo, 'secciones', secciones);
  }

  eliminarOpcionDeNodo(nodo: CanvasNode, secIdx: number, optIdx: number): void {
    const c         = this.whatsappConfig(nodo);
    const eliminada = c.secciones?.[secIdx]?.opciones?.[optIdx];
    const secciones: WhatsappSeccion[] = (c.secciones ?? []).map((s, i) =>
      i === secIdx ? { ...s, opciones: s.opciones.filter((_, j) => j !== optIdx) } : s
    );
    if (eliminada) {
      this.aristas.update(as => as.filter(
        a => !(a.source === nodo.id && a.condicion === eliminada.id)
      ));
    }
    this.actualizarCampoWp(nodo, 'secciones', secciones);
  }

  actualizarTipoWpDeNodo(nodo: CanvasNode, tipo: WhatsappTipo): void {
    const base = this.whatsappConfig(nodo);
    if ((base.tipo === 'botones' || base.tipo === 'lista') && tipo !== base.tipo) {
      this.aristas.update(as => as.filter(a => !(a.source === nodo.id && a.condicion)));
    }
    const nuevo: WhatsappNodeConfig = { tipo, mensaje: base.mensaje };
    if (tipo === 'botones') {
      nuevo.botones = base.botones?.length
        ? base.botones
        : [{ id: `btn_${Date.now()}`, texto: '' }, { id: `btn_${Date.now() + 1}`, texto: '' }];
    }
    if (tipo === 'lista') {
      nuevo.secciones = base.secciones?.length
        ? base.secciones
        : [{ titulo: '', opciones: [{ id: `opt_${Date.now()}`, titulo: '' }] }];
    }
    if (tipo === 'template') {
      nuevo.templateNombre = base.templateNombre;
      nuevo.templateParams = base.templateParams;
    }
    if (tipo === 'media')     { nuevo.mediaType = base.mediaType ?? 'image'; nuevo.mediaUrl = base.mediaUrl; }
    if (tipo === 'ticket')    { nuevo.ticketTipo = base.ticketTipo; nuevo.mensajeFinal = base.mensajeFinal; }
    if (tipo === 'condicion') {
      nuevo.condicionCampo    = base.condicionCampo;
      nuevo.condicionOperador = base.condicionOperador ?? 'eq';
      nuevo.condicionValor    = base.condicionValor;
    }
    this.actualizarNodoDirecto(nodo, nuevo);
  }

  actualizarSmsDeNodo(nodo: CanvasNode, message: string): void {
    this.actualizarNodoDirecto(nodo, { message } as SmsNodeConfig);
  }

  actualizarEmailDeNodo(nodo: CanvasNode, campo: 'subject' | 'body', valor: string): void {
    this.actualizarNodoDirecto(nodo, { ...this.emailConfig(nodo), [campo]: valor } as EmailNodeConfig);
  }

  // ─────────────────────────────────────────────────────────
  // Métodos que actúan sobre nodoActivo (panel lateral)
  // ─────────────────────────────────────────────────────────

  actualizarTipoWp(tipo: WhatsappTipo): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'whatsapp') return;
    const base = this.whatsappConfig(activo);
    if ((base.tipo === 'botones' || base.tipo === 'lista') && tipo !== base.tipo) {
      this.aristas.update(as => as.filter(a => !(a.source === activo.id && a.condicion)));
    }
    const nuevo: WhatsappNodeConfig = { tipo, mensaje: base.mensaje };
    if (tipo === 'botones') {
      nuevo.botones = base.botones?.length
        ? base.botones
        : [{ id: 'btn_1', texto: '' }, { id: 'btn_2', texto: '' }];
    }
    if (tipo === 'lista') {
      nuevo.secciones = base.secciones?.length
        ? base.secciones
        : [{ titulo: '', opciones: [{ id: `opt_${Date.now()}`, titulo: '' }] }];
    }
    if (tipo === 'template') {
      nuevo.templateNombre = base.templateNombre;
      nuevo.templateParams = base.templateParams;
    }
    if (tipo === 'media')  nuevo.mediaType = base.mediaType ?? 'image';
    if (tipo === 'ticket') nuevo.ticketTipo = base.ticketTipo;
    this.actualizarConfig(nuevo);
  }

  private actualizarConfigWp(parcial: Partial<WhatsappNodeConfig>): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'whatsapp') return;
    this.actualizarConfig({ ...this.whatsappConfig(activo), ...parcial } as WhatsappNodeConfig);
  }

  actualizarConfigWpDirecto(campo: keyof WhatsappNodeConfig, valor: unknown): void {
    this.actualizarConfigWp({ [campo]: valor } as Partial<WhatsappNodeConfig>);
  }

  actualizarMensajeWp(mensaje: string): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'whatsapp') return;
    this.actualizarConfig({ ...this.whatsappConfig(activo), mensaje } as WhatsappNodeConfig);
  }

  actualizarTemplateNombre(templateNombre: string): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'whatsapp') return;
    this.actualizarConfig({ ...this.whatsappConfig(activo), templateNombre } as WhatsappNodeConfig);
  }

  actualizarTemplateParams(raw: string): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'whatsapp') return;
    const templateParams = raw.split('\n').map(p => p.trim()).filter(Boolean);
    this.actualizarConfig({ ...this.whatsappConfig(activo), templateParams } as WhatsappNodeConfig);
  }

  actualizarAsunto(asunto: string): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'email') return;
    this.actualizarConfig({ ...this.emailConfig(activo), subject: asunto } as EmailNodeConfig);
  }

  actualizarCuerpo(cuerpo: string): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'email') return;
    this.actualizarConfig({ ...this.emailConfig(activo), body: cuerpo } as EmailNodeConfig);
  }

  // --- Botones (actúan sobre nodoActivo) ---

  agregarBoton(): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'whatsapp') return;
    const c       = this.whatsappConfig(activo);
    const botones = [...(c.botones ?? [])];
    if (botones.length >= 3) return;
    botones.push({ id: `btn_${botones.length + 1}`, texto: '' });
    this.actualizarConfigWp({ botones });
  }

  eliminarBoton(idx: number): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'whatsapp') return;
    const c         = this.whatsappConfig(activo);
    const eliminado = c.botones?.[idx];
    const botones   = (c.botones ?? []).filter((_, i) => i !== idx);
    this.actualizarConfigWp({ botones });
    if (eliminado) {
      this.aristas.update(as => as.filter(
        a => !(a.source === activo.id && a.condicion === eliminado.id)
      ));
    }
  }

  actualizarTextoBoton(idx: number, texto: string): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'whatsapp') return;
    const c       = this.whatsappConfig(activo);
    const botones = (c.botones ?? []).map((b, i) => i === idx ? { ...b, texto } : b);
    this.actualizarConfigWp({ botones });
  }

  // --- Lista ---

  agregarSeccion(): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'whatsapp') return;
    const c         = this.whatsappConfig(activo);
    const secciones = [
      ...(c.secciones ?? []),
      { titulo: '', opciones: [{ id: `opt_${Date.now()}`, titulo: '' }] },
    ];
    this.actualizarConfigWp({ secciones });
  }

  agregarOpcion(secIdx: number): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'whatsapp') return;
    const c = this.whatsappConfig(activo);
    const secciones: WhatsappSeccion[] = (c.secciones ?? []).map((s, i) =>
      i === secIdx
        ? { ...s, opciones: [...s.opciones, { id: `opt_${Date.now()}`, titulo: '' }] }
        : s
    );
    this.actualizarConfigWp({ secciones });
  }

  eliminarOpcion(secIdx: number, optIdx: number): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'whatsapp') return;
    const c         = this.whatsappConfig(activo);
    const eliminada = c.secciones?.[secIdx]?.opciones?.[optIdx];
    const secciones: WhatsappSeccion[] = (c.secciones ?? []).map((s, i) =>
      i === secIdx ? { ...s, opciones: s.opciones.filter((_, j) => j !== optIdx) } : s
    );
    this.actualizarConfigWp({ secciones });
    if (eliminada) {
      this.aristas.update(as => as.filter(
        a => !(a.source === activo.id && a.condicion === eliminada.id)
      ));
    }
  }

  actualizarTituloSeccion(secIdx: number, titulo: string): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'whatsapp') return;
    const c = this.whatsappConfig(activo);
    const secciones: WhatsappSeccion[] = (c.secciones ?? []).map(
      (s, i) => i === secIdx ? { ...s, titulo } : s
    );
    this.actualizarConfigWp({ secciones });
  }

  actualizarTituloOpcion(secIdx: number, optIdx: number, titulo: string): void {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'whatsapp') return;
    const c = this.whatsappConfig(activo);
    const secciones: WhatsappSeccion[] = (c.secciones ?? []).map((s, i) =>
      i === secIdx
        ? { ...s, opciones: s.opciones.map((o, j) => j === optIdx ? { ...o, titulo } : o) }
        : s
    );
    this.actualizarConfigWp({ secciones });
  }

  // ─────────────────────────────────────────────────────────
  // Aristas
  // ─────────────────────────────────────────────────────────

  eliminarArista(source: string, target: string, condicion?: string): void {
    this.aristas.update(as => as.filter(a =>
      !(a.source === source && a.target === target && a.condicion === condicion)
    ));
  }

  eliminarConexionesSeleccionadas(): void {
    const ids = [...this.conexionesSeleccionadas()];
    this.conexionesSeleccionadas.set([]);
    if (!ids.length) return;
    this.aristas.update(as => as.filter(a => {
      const source = a.condicion
        ? `${a.source}__${a.condicion}__out`
        : `${a.source}_out`;
      const target = `${a.target}_in`;
      return !ids.some(id => id.includes(source) && id.includes(target));
    }));
  }

  // ─────────────────────────────────────────────────────────
  // Branching helpers
  // ─────────────────────────────────────────────────────────

  destinoBranch(nodo: CanvasNode, condicion: string): string {
    const arista = this.aristas().find(a => a.source === nodo.id && a.condicion === condicion);
    if (!arista) return '— sin conexión';
    return this.etiquetaNodo(arista.target);
  }

  targetDeRama(nodo: CanvasNode, condicion: string): string {
    return this.aristas().find(
      a => a.source === nodo.id && a.condicion === condicion
    )?.target ?? '';
  }

  nodosDisponibles(nodoId: string): CanvasNode[] {
    return this.nodos().filter(n => n.id !== nodoId && n.type !== 'annotation');
  }

  asignarDestinoBranch(nodo: CanvasNode, condicion: string, targetId: string): void {
    this.aristas.update(edges => {
      const sinEsta = edges.filter(a => !(a.source === nodo.id && a.condicion === condicion));
      if (!targetId) return sinEsta;
      return [...sinEsta, { source: nodo.id, target: targetId, condicion }];
    });
  }

  // ─────────────────────────────────────────────────────────
  // Advertencias / etiquetas
  // ─────────────────────────────────────────────────────────

  etiquetaNodo(id: string): string {
    const nodo = this.nodos().find(n => n.id === id);
    if (!nodo) return id;
    if (nodo.name) return nodo.name;
    if (nodo.type === 'segment')  return 'Segmento';
    if (nodo.type === 'sms')      return `SMS "${this.truncar(this.smsConfig(nodo).message)}"`;
    if (nodo.type === 'email')    return `Email "${this.truncar(this.emailConfig(nodo).subject)}"`;
    if (nodo.type === 'whatsapp') {
      const c = this.whatsappConfig(nodo);
      return `WP "${this.truncar(c.tipo === 'texto' ? c.mensaje : c.templateNombre)}"`;
    }
    return id;
  }

  tieneAdvertencia(nodo: CanvasNode): boolean {
    if (nodo.type === 'sms') return !this.smsConfig(nodo).message?.trim();
    if (nodo.type === 'email') {
      const c = this.emailConfig(nodo);
      return !c.subject?.trim() || !c.body?.trim();
    }
    if (nodo.type === 'whatsapp') {
      const c = this.whatsappConfig(nodo);
      if (c.tipo === 'texto')    return !c.mensaje?.trim();
      if (c.tipo === 'template') return !c.templateNombre?.trim();
      if (c.tipo === 'botones')  return !(c.botones?.length) || c.botones.some(b => !b.texto.trim());
      if (c.tipo === 'lista')    return !(c.secciones?.length) || !c.bodyTexto?.trim();
      if (c.tipo === 'media')    return !c.mediaUrl?.trim();
      if (c.tipo === 'ticket')   return !c.ticketTipo;
      if (c.tipo === 'condicion') return !c.condicionCampo?.trim() || !c.condicionValor?.trim();
    }
    if (nodo.type === 'segment') return !(this.segmentConfig(nodo).filters?.conditions?.length);
    return false;
  }

  textoAdvertencia(nodo: CanvasNode): string {
    if (nodo.type === 'sms') return 'Mensaje vacío';
    if (nodo.type === 'email') {
      const c = this.emailConfig(nodo);
      if (!c.subject?.trim() && !c.body?.trim()) return 'Asunto y cuerpo vacíos';
      if (!c.subject?.trim()) return 'Asunto vacío';
      return 'Cuerpo vacío';
    }
    if (nodo.type === 'whatsapp') {
      const c = this.whatsappConfig(nodo);
      if (c.tipo === 'texto')    return 'Mensaje vacío';
      if (c.tipo === 'template') return 'Nombre de template vacío';
      if (c.tipo === 'botones')  return 'Botones incompletos';
      if (c.tipo === 'lista')    return 'Lista incompleta';
      if (c.tipo === 'media')    return 'URL de media vacía';
      if (c.tipo === 'ticket')   return 'Tipo de ticket no definido';
      if (c.tipo === 'condicion') return 'Condición sin configurar';
    }
    if (nodo.type === 'segment') return 'Sin filtros configurados';
    return '';
  }

  private etiquetaAccion(nodo: CanvasNode): string {
    if (nodo.name) return nodo.name;
    if (nodo.type === 'sms')   return this.truncar(this.smsConfig(nodo).message);
    if (nodo.type === 'email') return this.emailConfig(nodo).subject || 'Sin asunto';
    if (nodo.type === 'whatsapp') {
      const c = this.whatsappConfig(nodo);
      if (c.tipo === 'texto')    return this.truncar(c.mensaje);
      if (c.tipo === 'template') return c.templateNombre || 'Sin template';
      if (c.tipo === 'botones')  return `Botones (${c.botones?.length ?? 0})`;
      if (c.tipo === 'lista')    return 'Lista de opciones';
      if (c.tipo === 'media')    return c.mediaType === 'video' ? 'Video' : c.mediaType === 'document' ? 'Documento' : 'Imagen';
      if (c.tipo === 'ticket')   return c.ticketTipo === 'venta' ? 'Ticket de venta' : 'Ticket de soporte';
      if (c.tipo === 'condicion') return `Si ${c.condicionCampo ?? '?'} ${c.condicionOperador ?? 'eq'} ${c.condicionValor ?? '?'}`;
    }
    return nodo.id;
  }

  // ─────────────────────────────────────────────────────────
  // Validación del grafo (público para que el editor lo llame)
  // ─────────────────────────────────────────────────────────

  validarReglasGrafo(): string | null {
    const nodos   = this.nodos();
    const aristas = this.aristas();

    if (nodos.length === 0) {
      return 'El canvas está vacío. Agrega al menos un Segmento y un nodo de acción conectados.';
    }

    const tieneSegmento = nodos.some(n => n.type === 'segment');
    const tieneAccion   = nodos.some(n => TIPOS_ACCION.includes(n.type));

    if (!tieneSegmento || !tieneAccion) {
      this.nodosConError.set(new Set(nodos.map(n => n.id)));
      return 'El canvas necesita al menos un nodo Segmento y una acción conectados para guardar.';
    }

    const accionesNoWp = nodos.filter(n => n.type === 'sms' || n.type === 'email');
    const accionesNoWpDesconectadas = accionesNoWp.filter(accion =>
      !aristas.some(a => {
        if (a.target !== accion.id) return false;
        return nodos.find(n => n.id === a.source)?.type === 'segment';
      })
    );

    if (accionesNoWpDesconectadas.length > 0) {
      this.nodosConError.set(new Set(accionesNoWpDesconectadas.map(n => n.id)));
      const nombres = accionesNoWpDesconectadas.map(n => `"${this.etiquetaAccion(n)}"`).join(', ');
      return `Nodo(s) sin Segmento conectado: ${nombres}.`;
    }

    const wpDesconectados = nodos
      .filter(n => n.type === 'whatsapp')
      .filter(wp => !aristas.some(a => {
        if (a.target !== wp.id) return false;
        const origen = nodos.find(n => n.id === a.source);
        return origen?.type === 'segment' || origen?.type === 'whatsapp';
      }));

    if (wpDesconectados.length > 0) {
      this.nodosConError.set(new Set(wpDesconectados.map(n => n.id)));
      const nombres = wpDesconectados.map(n => `"${this.etiquetaAccion(n)}"`).join(', ');
      return `Nodo(s) WhatsApp sin origen conectado: ${nombres}. Conecta desde un Segmento u otro nodo WhatsApp.`;
    }

    const segmentosDesconectados = nodos
      .filter(n => n.type === 'segment')
      .filter(seg => !aristas.some(a => {
        if (a.source !== seg.id) return false;
        return nodos.find(n => n.id === a.target) !== undefined;
      }));

    if (segmentosDesconectados.length > 0) {
      this.nodosConError.set(new Set(segmentosDesconectados.map(n => n.id)));
      return 'Nodo(s) Segmento sin acción conectada como destino.';
    }

    this.nodosConError.set(new Set());
    return null;
  }

  // ─────────────────────────────────────────────────────────
  // Preview / utilidades
  // ─────────────────────────────────────────────────────────

  async previewAudiencia(): Promise<void> {
    const nodo = this.nodoActivo();
    if (!nodo || nodo.type !== 'segment') return;
    const filtros = (nodo.config as SegmentNodeConfig).filters;
    if (!filtros || filtros.conditions.length === 0) return;
    this.cargandoAudiencia.set(true);
    try {
      this.audiencia.set(await this.audienceUseCase.ejecutar(nodo.id, filtros));
    } finally {
      this.cargandoAudiencia.set(false);
    }
  }

  insertarVariable(token: string): void {
    const textarea = document.querySelector<HTMLTextAreaElement>('.sms-textarea');
    if (!textarea) {
      this.actualizarMensaje((this.smsConfig(this.nodoActivo()!).message ?? '') + token);
      return;
    }
    const inicio = textarea.selectionStart ?? 0;
    const fin    = textarea.selectionEnd   ?? 0;
    const actual = textarea.value;
    const nuevo  = actual.slice(0, inicio) + token + actual.slice(fin);
    this.actualizarMensaje(nuevo);
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = inicio + token.length;
      textarea.setSelectionRange(pos, pos);
    });
  }

  previewMensaje(mensaje: string): string {
    const audiencia = this.audiencia();
    const contacto  = audiencia?.contactos?.[0] as Contact | undefined;
    return contacto
      ? resolverVariables(mensaje, contacto)
      : resolverVariablesEjemplo(mensaje);
  }

  truncar(msg: string | undefined): string {
    if (!msg) return 'Sin mensaje';
    return msg.length > 30 ? msg.slice(0, 30) + '...' : msg;
  }

  get contadorSms(): string {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'sms') return '';
    const msg     = (activo.config as SmsNodeConfig).message ?? '';
    const unicode = /[^\x00-\x7F]/.test(msg);
    return `${msg.length}/${unicode ? 70 : 160} ${unicode ? '(Unicode)' : '(GSM)'}`;
  }

  get superaLimiteSms(): boolean {
    const activo = this.nodoActivo();
    if (!activo || activo.type !== 'sms') return false;
    const msg = (activo.config as SmsNodeConfig).message ?? '';
    return msg.length > (/[^\x00-\x7F]/.test(msg) ? 70 : 160);
  }

  // ─────────────────────────────────────────────────────────
  // Anotaciones
  // ─────────────────────────────────────────────────────────

  actualizarTextoAnnotation(nodo: CanvasNode, text: string): void {
    this.nodos.update(ns => ns.map(n =>
      n.id === nodo.id ? { ...n, config: { ...this.annotationConfig(n), text } } : n
    ));
  }

  actualizarColorAnnotation(nodo: CanvasNode, color: string): void {
    this.nodos.update(ns => ns.map(n =>
      n.id === nodo.id ? { ...n, config: { ...this.annotationConfig(n), color } } : n
    ));
  }

  // ─────────────────────────────────────────────────────────
  // Marcos / grupos
  // ─────────────────────────────────────────────────────────

  agregarMarco(): void {
    const id = `group-${this.nextGroupId++}`;
    this.grupos.update(gs => [...gs, {
      id, title: 'Proceso', color: '#4a90e2',
      x: 100, y: 100, width: 360, height: 280,
    }]);
  }

  actualizarTituloGrupo(id: string, title: string): void {
    this.grupos.update(gs => gs.map(g => g.id === id ? { ...g, title } : g));
  }

  actualizarColorGrupo(id: string, color: string): void {
    this.grupos.update(gs => gs.map(g => g.id === id ? { ...g, color } : g));
  }

  actualizarPosGrupo(id: string, pos: { x: number; y: number }): void {
    this.grupos.update(gs => gs.map(g => g.id === id ? { ...g, x: pos.x, y: pos.y } : g));
  }

  actualizarTamGrupo(id: string, size: { width: number; height: number }): void {
    this.grupos.update(gs => gs.map(g =>
      g.id === id ? { ...g, width: size.width, height: size.height } : g
    ));
  }

  eliminarGrupo(id: string): void {
    this.grupos.update(gs => gs.filter(g => g.id !== id));
  }
}
