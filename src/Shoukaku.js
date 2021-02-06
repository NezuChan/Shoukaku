const { RawRouter } = require('./router/ShoukakuRouter.js');
const { ShoukakuOptions, ShoukakuNodeOptions, ShoukakuStatus } = require('./constants/ShoukakuConstants.js');
const { mergeDefault } = require('./util/ShoukakuUtil.js');
const { version } = require('discord.js');
const ShoukakuError = require('./constants/ShoukakuError.js');
const ShoukakuSocket = require('./node/ShoukakuSocket.js');
const EventEmitter = require('events');

/**
  * Shoukaku, governs the client's node connections.
  * @class Shoukaku
  * @extends {EventEmitter}
  */
class Shoukaku extends EventEmitter {
    /**
     * @param  {Client} client Your Discord.js client
     * @param {ShoukakuConstants#ShoukakuNodes} nodes Lavalink Nodes where Shoukaku will try to connect to.
     * @param {ShoukakuConstants#ShoukakuOptions} options Options to initialize Shoukaku with
     */
    constructor(client, nodes, options) {
        super();
        if (version && !version.startsWith('12'))
            throw new ShoukakuError('Shoukaku will only work in Discord.JS v12. Versions below Discord.JS v12 is not supported.');
        /**
        * The instance of Discord.js client used with Shoukaku.
        * @type {external.Client}
        */
        this.client = client;
        /**
        * The user id of the bot that is being governed by Shoukaku.
        * @type {?string}
        */
        this.id = null;
        /**
        * The current nodes that is being handled by Shoukaku.
        * @type {Map<string, ShoukakuSocket>}
        */
        this.nodes = new Map();

        Object.defineProperty(this, 'options', { value: mergeDefault(ShoukakuOptions, options) });
        Object.defineProperty(this, 'rawRouter', { value: RawRouter.bind(this) });
        this.client.once('ready', () => {
            this.id = this.client.user.id;
            for (const node of nodes) this.addNode(mergeDefault(ShoukakuNodeOptions, node));
        });
        this.client.on('raw', this.rawRouter);
    }
    /**
     * Gets all the Players that is currently active on all nodes in this instance.
     * @type {Map<string, ShoukakuPlayer>}
     * @memberof Shoukaku
     */
    get players() {
        const players = new Map();
        for (const node of this.nodes.values()) {
            for (const [id, player] of node.players) players.set(id, player);
        }
        return players;
    }
    /**
     * Gets the number of total Players that is currently active on all nodes in this instance.
     * @type {number}
     * @memberof Shoukaku
     */
    get totalPlayers() {
        let counter = 0;
        for (const node of this.nodes.values()) counter += node.players.size;
        return counter;
    }

    /**
     * Emitted when a Lavalink Node sends a debug event.
     * @event Shoukaku#debug
     * @param {string} name The name of the Lavalink Node that sent a debug event.
     * @param {Object} data The actual debug data
     * @memberof Shoukaku
     */
    /**
     * Emitted when a lavalink Node encouters an error. This event MUST BE HANDLED.
     * @event Shoukaku#error
     * @param {string} name The name of the Lavalink Node that sent an error event or 'Shoukaku' if the error is from Shoukaku.
     * @param {Error} error The error encountered.
     * @memberof Shoukaku
     * @example
     * // <Shoukaku> is your own instance of Shoukaku
     * <Shoukaku>.on('error', console.error);
     */
    /** name, code, reason, isReconnectable
     * Emitted when a Lavalink Node becomes Ready from a Reconnection or First Connection.
     * @event Shoukaku#ready
     * @param {string} name The name of the Lavalink Node that sent a ready event.
     * @param {boolean} reconnect True if the session reconnected, otherwise false.
     * @memberof Shoukaku
     */
    /**
     * Emitted when a Lavalink Node closed.
     * @event Shoukaku#close
     * @param {string} name The name of the Lavalink Node that sent a close event.
     * @param {number} code The WebSocket close code https://github.com/Luka967/websocket-close-codes
     * @param {reason} reason The reason for this close event.
     * @memberof Shoukaku
     */
    /**
     * Emitted when a Lavalink Node will not try to reconnect again.
     * @event Shoukaku#disconnected
     * @param {string} name The name of the Lavalink Node that sent a close event.
     * @param {string} reason The reason for the disconnect.
     * @memberof Shoukaku
     */

    /**
    * Function to register a Lavalink Node
    * @param {ShoukakuConstants#ShoukakuNodeOptions} nodeOptions The Node Options to be used to connect to.
    * @memberof Shoukaku
    * @returns {void}
    */
    addNode(nodeOptions) {
        if (!this.id)
            throw new ShoukakuError('The lib is not yet ready, make sure to initialize Shoukaku before the library fires "ready" event');
        const node = new ShoukakuSocket(this, nodeOptions);
        node.connect(this.id, false);
        node.on('debug', ...args => this.emit('debug', ...args));
        node.on('error', ...args => this.emit('error', ...args));
        node.on('ready', ...args => this._ready(...args));
        node.on('close', ...args => this._close(...args));
        this.nodes.set(node.name, node);
    }
    /**
     * Function to remove a Lavalink Node
     * @param {string} name The Lavalink Node to remove
     * @param {string} [reason] Optional reason for this disconnect.
     * @memberof Shoukaku
     * @returns {void}
     */
    removeNode(name, reason) {
        if (!this.id)
            throw new ShoukakuError('The lib is not yet ready, make sure to initialize Shoukaku before the library fires "ready" event');
        const node = this.nodes.get(name);
        if (!node) return;
        node.state = ShoukakuStatus.DISCONNECTING;
        node.executeCleaner()
            .catch(error => this.emit('error', name, error))
            .finally(() => {
                this.nodes.delete(name);
                this.removeListener('packetUpdate', node.packetRouter);
                node.removeAllListeners();
                if (node.ws) {
                    node.ws.removeAllListeners();
                    node.ws.close(4011, 'Remove node executed.');
                }
                node.state = ShoukakuStatus.DISCONNECTED;
                this.emit('disconnected', name, reason);
            });
    }
    /**
     * Shortcut to get the Ideal Node or a manually specified Node from the current nodes that Shoukaku governs.
     * @param {string|Array<string>} [query] If blank, Shoukaku will return an ideal node from default group of nodes. If a string is specified, will return a node from it's name, if an array of string groups, Shoukaku will return an ideal node from the specified array of grouped nodes.
     * @memberof Shoukaku
     * @returns {ShoukakuSocket}
     * @example
     * const node = <Shoukaku>.getNode();
     * node.rest.resolve('Kongou Burning Love', 'youtube')
     *     .then(data => {
     *         node.joinVoiceChannel({
     *             guildID: 'guild_id',
     *             voiceChannelID: 'voice_channel_id'
     *         }).then(player => player.playTrack(data.track))
     *     })
     */
    getNode(query) {
        if (!this.id)
            throw new ShoukakuError('The lib is not yet ready, make sure to initialize Shoukaku before the library fires "ready" event');
        if (!this.nodes.size)
            throw new ShoukakuError('No nodes available, please add a node first.');
        if (!query || Array.isArray(query))
            return this._getIdeal(query);
        const node = this.nodes.get(query);
        if (!node)
            throw new ShoukakuError('The node name you specified is not one of my nodes');
        if (node.state !== ShoukakuStatus.CONNECTED)
            throw new ShoukakuError('This node is not yet ready');
        return node;
    }
    /**
    * Shortcut to get the Player of a guild, if there is any.
    * @param {string} guildID The guildID of the guild we are trying to get.
    * @memberof Shoukaku
    * @returns {?ShoukakuPlayer}
    */
    getPlayer(guildID) {
        if (!this.id)
            throw new ShoukakuError('The lib is not yet ready, make sure to initialize Shoukaku before the library fires "ready" event');
        if (!guildID) return null;
        return this.players.get(guildID);
    }

    _ready(name, resumed) {
        this.nodes.get(name).executeCleaner()
            .catch(error => this.emit('error', name, error))
            .finally(() => this.emit('ready', name, resumed));
    }

    _close(name, code, reason) {
        this.emit('close', name, code, reason);
        this._reconnect(this.nodes.get(name));
    }

    _reconnect(node) {
        if (node.reconnectAttempts >= this.options.reconnectTries)
            return this.removeNode(node.name, `Failed to reconnect in ${this.options.reconnectTries} attempt(s)`);
        try {
            node.reconnectAttempts++;
            node.connect(this.id, this.options.resumable);
        } catch (error) {
            this.emit('error', node.name, error);
            setTimeout(() => this._reconnect(node), this.options.reconnectInterval);
        }
    }

    _getIdeal(group) {
        const nodes = [...this.nodes.values()]
            .filter(node => node.state === ShoukakuStatus.CONNECTED);
        if (!group) {
            return nodes
                .sort((a, b) => a.penalties - b.penalties)
                .shift();
        }
        return nodes
            .filter(node => group.includes(node.group))
            .sort((a, b) => a.penalties - b.penalties)
            .shift();
    }
}
module.exports = Shoukaku;
