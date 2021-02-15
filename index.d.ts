declare module 'shoukaku' {
  import { EventEmitter } from 'events';
  import { Client as DiscordClient, Base64String, Guild } from 'discord.js';

  export const version: string;

  export class ShoukakuError extends Error {
    constructor(message: string);
    public name: string;
  }

  export class ShoukakuTimeout extends Error {
    constructor(time: number);
    public name: string;
  }

  export class ShoukakuUtil {
    public static mergeDefault(def: Object, given: Object): Object;
    public static searchType(string: string): string;
    public static websocketSend(ws: WebSocket, payload: Object): Promise<void>;
  }

  export class ShoukakuTrackList {
    type: 'PLAYLIST' | 'TRACK' | 'SEARCH';
    playlistName?: string;
    selectedTrack: number;
    tracks: Array<ShoukakuTrack>;
  }

  export class ShoukakuTrack {
    track: string;
    info: {
      identifier?: string;
      isSeekable?: boolean;
      author?: string;
      length?: number;
      isStream?: boolean;
      position?: number;
      title?: string;
      uri?: string;
    };
  }

  export type Source = 'youtube' | 'soundcloud';

  export enum ShoukakuStatus {
    CONNECTING = 'CONNECTING',
    CONNECTED = 'CONNECTED',
    DISCONNECTING = 'DISCONNECTING',
    DISCONNECTED = 'DISCONNECTED',
  }

  export interface PlayerStartEvent {
    track: string;
    guildId: string;
  }

  export interface PlayerEndEvent {
    reason: 'FINISHED' | 'LOAD_FAILED' | 'STOPPED' | 'REPLACED' | 'CLEANUP';
    track: string;
    guildId: string;
  }

  export interface PlayerExceptionEvent {
    track: string;
    exception: {
      message: string;
      severity: 'COMMON' | 'SUSPICIOUS' | 'FAULT';
      cause: string;
    };
    guildId: string;
  }

  export interface PlayerClosedEvent {
    reason: string;
    code: number;
    byRemote: boolean;
    guildId: string;
  }

  export interface PlayerUpdateEvent {
    guildId: string;
    state: {
      time: number;
      position: number;
    }
  }

  export interface ShoukakuNodeStats {
    playingPlayers: number;
    op: 'stats';
    memory: {
      reservable: number;
      used: number;
      free: number;
      allocated: number;
    };
    frameStats: {
      sent: number;
      deficit: number;
      nulled: number;
    };
    players: number;
    cpu: {
      cores: number;
      systemLoad: number;
      lavalinkLoad: number;
    };
    uptime: number;
  }

  export interface ShoukakuJoinOptions {
    guildID: string;
    voiceChannelID: string;
    mute?: boolean;
    deaf?: boolean;
  }

  export interface ShoukakuPlayOptions {
    noReplace?: boolean,
    startTime?: number;
    endTime?: number;
  }

  export interface ShoukakuOptions {
    resumable?: boolean | string;
    resumableTimeout?: number;
    reconnectTries?: number;
    moveOnDisconnect?: boolean;
    restTimeout?: number;
    reconnectInterval?: number;
    userAgent?: string;
  }

  export interface ShoukakuNodeOptions {
    name: string;
    host: string;
    port: number;
    auth: string;
    group?: string;
    secure: boolean;
  }

  export interface EqualizerBand {
    band: number;
    gain: number;
  }

  export interface KaraokeValue {
    level?: number;
    monoLevel?: number;
    filterBand?: number;
    filterWidth?: number;
  }

  export interface TimescaleValue {
    speed?: number;
    pitch?: number;
    rate?: number;
  }

  export interface TremoloValue {
    frequency?: number;
    depth?: number;
  }

  export interface VibratoValue {
    frequency?: number;
    depth?: number;
  }

  export interface RotationValue {
    rotationHz?: number;
  }

  export interface DistortionValue {
    sinOffset?: number;
    sinScale?: number;
    cosOffset?: number;
    cosScale?: number;
    tanOffset?: number;
    tanScale?: number;
    offset?: number;
    scale?: number;
}

  class ShoukakuConstants {
    static ShoukakuStatus: ShoukakuStatus;
    static ShoukakuNodeStats: ShoukakuNodeStats;
    static ShoukakuJoinOptions: ShoukakuJoinOptions;
    static ShoukakuPlayOptions: ShoukakuPlayOptions;
    static ShoukakuOptions: ShoukakuOptions;
    static ShoukakuNodeOptions: ShoukakuNodeOptions;
    static ShoukakuNodes: Array<ShoukakuNodeOptions>;
    static EqualizerBand: EqualizerBand;
    static KaraokeValue: KaraokeValue;
    static TimescaleValue: TimescaleValue;
    static TremoloValue: TremoloValue;
    static VibratoValue: VibratoValue;
    static RotationValue: RotationValue;
    static DistortionValue: DistortionValue;
  }

  export { ShoukakuConstants as Constants };

  export class ShoukakuFilter {
    public volume: number;
    public equalizer: EqualizerBand[];
    public karaoke?: KaraokeValue;
    public timescale?: TimescaleValue;
    public tremolo?: TremoloValue;
    public vibrato?: VibratoValue;
    public rotation?: RotationValue;
    public distortion?: DistortionValue;
  }

  export interface ShoukakuGroupedFilterOptions {
    volume?: number;
    equalizer?: EqualizerBand[];
    karaoke?: KaraokeValue;
    timescale?: TimescaleValue;
    tremolo?: TremoloValue;
    vibrato?: VibratoValue;
    rotation?: RotationValue;
    distortion?: DistortionValue;
  }

  export class ShoukakuRest {
    constructor(host: string, port: string, auth: string, timeout: number, secure: boolean);
    private auth: string;
    public timeout: number;
    public url: string;

    public resolve(identifier: string, search?: Source): Promise<ShoukakuTrackList | null>;
    public decode(track: Base64String): Promise<Object>;
    public getRoutePlannerStatus(): Promise<Object>;
    public unmarkFailedAddress(address: string): Promise<number>;
    public unmarkAllFailedAddress(): Promise<number>;

    private _get(url: string): Promise<JSON>;
    private _post(url: string, body: Object): Promise<number>;
  }

  export interface ShoukakuPlayer {
    on(event: 'end', listener: (data: PlayerEndEvent) => void): this;
    on(event: 'error', listener: (err: ShoukakuError | Error) => void): this;
    on(event: 'nodeDisconnect', listener: (err: ShoukakuError) => void): this;
    on(event: 'resumed', listener: () => void): this;
    on(event: 'playerUpdate', listener: (data: PlayerUpdateEvent['state']) => void): this;
    on(event: 'trackException', listener: (data: PlayerExceptionEvent) => void): this;
    on(event: 'closed', listener: (data: PlayerClosedEvent) => void): this;
    on(event: 'start', listener: (data: PlayerStartEvent) => void): this;
    once(event: 'end', listener: (data: PlayerEndEvent) => void): this;
    once(event: 'error', listener: (err: ShoukakuError | Error) => void): this;
    once(event: 'nodeDisconnect', listener: (err: ShoukakuError) => void): this;
    once(event: 'resumed', listener: () => void): this;
    once(event: 'playerUpdate', listener: (data: PlayerUpdateEvent['state']) => void): this;
    once(event: 'trackException', listener: (data: PlayerExceptionEvent) => void): this;
    once(event: 'closed', listener: (data: PlayerClosedEvent) => void): this;
    once(event: 'start', listener: (data: PlayerStartEvent) => void): this;
    off(event: 'end', listener: (data: PlayerEndEvent) => void): this;
    off(event: 'error', listener: (err: ShoukakuError | Error) => void): this;
    off(event: 'nodeDisconnect', listener: (err: ShoukakuError) => void): this;
    off(event: 'resumed', listener: () => void): this;
    off(event: 'playerUpdate', listener: (data: PlayerUpdateEvent['state']) => void): this;
    off(event: 'trackException', listener: (data: PlayerExceptionEvent) => void): this;
    off(event: 'closed', listener: (data: PlayerClosedEvent) => void): this;
    off(event: 'start', listener: (data: PlayerStartEvent) => void): this;
  }

  export class ShoukakuPlayer extends EventEmitter {
    constructor(node: ShoukakuSocket, guild: Guild);
    public voiceConnection: ShoukakuLink;
    public track: string | null;
    public paused: boolean;
    public position: number;
    public filters: ShoukakuFilter;

    public disconnect(): void;
    public moveToNode(name: string): Promise<ShoukakuPlayer>;
    public playTrack(track: string | ShoukakuTrack, options?: ShoukakuPlayOptions): Promise<ShoukakuPlayer>;
    public stopTrack(): Promise<ShoukakuPlayer>;
    public setPaused(pause?: boolean): Promise<ShoukakuPlayer>;
    public seekTo(position: number): Promise<ShoukakuPlayer>;
    public setVolume(volume: number): Promise<ShoukakuPlayer>;
    public setEqualizer(bands: EqualizerBand[]): Promise<ShoukakuPlayer>;
    public setKaraoke(karaokeValue?: KaraokeValue): Promise<ShoukakuPlayer>;
    public setTimescale(timescalevalue?: TimescaleValue): Promise<ShoukakuPlayer>;
    public setTremolo(tremoloValue?: TremoloValue): Promise<ShoukakuPlayer>;
    public setVibrato(vibratoValue?: VibratoValue): Promise<ShoukakuPlayer>;
    public setRotation(rotationValue?: RotationValue): Promise<ShoukakuPlayer>;
    public setDistortion(distortionValue?: DistortionValue): Promise<ShoukakuPlayer>;
    public setGroupedFilters(settings?: ShoukakuGroupedFilterOptions): Promise<ShoukakuPlayer>;
    public clearFilters(): Promise<ShoukakuPlayer>;
    public resume(moved: boolean): Promise<void>;

    private connect(options: unknown, callback:(error: ShoukakuError | Error | null, player: ShoukakuPlayer) => void): void;
    private updateFilters(): Promise<void>;
    private reset(): void;
    private _onLavalinkMessage(json: Object): Promise<void>;
  }

  export class ShoukakuLink {
    constructor(player: ShoukakuPlayer, node: ShoukakuSocket, guild: Guild);
    public player: ShoukakuPlayer;
    public node: ShoukakuSocket;
    public guildID: string;
    public sessionID: string | null;
    public voiceChannelID: string | null;
    public region: string | null;
    public selfMute: boolean;
    public selfDeaf: boolean;
    public state: ShoukakuStatus;
    public channelMoved: boolean;
    public voiceMoved: boolean;

    private lastServerUpdate: unknown | null;
    private _callback: (err: ShoukakuError | Error | null, player: ShoukakuPlayer) => void | null;
    private _timeout: number | null;

    public attemptReconnect(): Promise<ShoukakuPlayer>;

    private stateUpdate(data: unknown);
    private serverUpdate(data: unknown);
    private connect(d: unknown, callback: (err: ShoukakuError | Error | null, player: ShoukakuPlayer) => void): void;
    private disconnect(): void;
    private moveToNode(): Promise<void>;
    private send(d: unknown): void;
    private voiceUpdate(): Promise<void>;
  }

  export class ShoukakuSocket {
    constructor(shoukaku: Shoukaku, node: ShoukakuOptions);
    public shoukaku: Shoukaku;
    public players: Map<string, ShoukakuPlayer>;
    public rest: ShoukakuRest;
    public state: ShoukakuStatus;
    public stats: ShoukakuNodeStats;
    public reconnectAttempts: number;
    public name: string;
    public group?: string;
    public url: string;
    public secure: boolean;
    public resumed: boolean;
    public penalties: number;

    private auth: string;
    private userAgent: string;
    private resumable: boolean | string;
    private resumableTimeout: number;
    private moveOnDisconnect: boolean;

    public connect(id: string, resumable: boolean | string): void;
    public joinVoiceChannel(options: ShoukakuJoinOptions): Promise<ShoukakuPlayer>;
    public leaveVoiceChannel(guildID: string): void;

    private send(data: unknown): Promise<void>;
    private configureResuming(): Promise<void>;
    private executeCleaner(): Promise<void>;

    private _upgrade(response: unknown): void;
    private _open(): void;
    private _message(packet: Object): Promise<void>;
    private _error(error: Error): void;
    private _close(code: number, reason: string): void;
    private _onClientFilteredRaw(packet: Object): void;
    private _onLavalinkMessage(json: Object): Promise<void>;
  }

  export interface Shoukaku {
    on(event: 'debug', listener: (name: string, data: string) => void): this;
    on(event: 'error', listener: (name: string, error: ShoukakuError | Error) => void): this;
    on(event: 'ready', listener: (name: string, reconnect: boolean) => void): this;
    on(event: 'close', listener: (name: string, code: number, reason: string | null) => void): this;
    on(event: 'disconnected', listener: (name: string, reason: string | null) => void): this;
    once(event: 'debug', listener: (name: string, data: string) => void): this;
    once(event: 'error', listener: (name: string, error: ShoukakuError | Error) => void): this;
    once(event: 'ready', listener: (name: string, reconnect: boolean) => void): this;
    once(event: 'close', listener: (name: string, code: number, reason: string | null) => void): this;
    once(event: 'disconnected', listener: (name: string, reason: string | null) => void): this;
    off(event: 'debug', listener: (name: string, data: string) => void): this;
    off(event: 'error', listener: (name: string, error: ShoukakuError | Error) => void): this;
    off(event: 'ready', listener: (name: string, reconnect: boolean) => void): this;
    off(event: 'close', listener: (name: string, code: number, reason: string | null) => void): this;
    off(event: 'disconnected', listener: (name: string, reason: string | null) => void): this;
  }

  export class Shoukaku extends EventEmitter {
    constructor(client: DiscordClient, nodes: ShoukakuNodeOptions[], options: ShoukakuOptions);
    public client: DiscordClient;
    public id: string | null;
    public nodes: Map<string, ShoukakuSocket>;

    public players: Map<string, ShoukakuPlayer>;
    public totalPlayers: number;

    private options: ShoukakuOptions;
    
    public addNode(nodeOptions: ShoukakuNodeOptions): void;
    public removeNode(name: string, reason?: string): void;
    public getNode(name?: string | string[]): ShoukakuSocket;
    public getPlayer(guildId: string): ShoukakuPlayer | null;

    private _ready(name: string, resumed: boolean): void;
    private _close(name: string, code: number, reason: string): void;
    private _reconnect(node: ShoukakuSocket): void;
    private _getIdeal(group: string): ShoukakuSocket;
    private _onClientReady(nodes: ShoukakuNodeOptions): void;
    private _onClientRaw(packet: Object): void;
  }
}
