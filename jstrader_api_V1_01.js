const net = require('net');

/**
 * Custom error class for JstraderApi errors
 * @extends Error
 */
class JsTraderApiError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'JsTraderApiError';
        this.code = code;
    }
}

/**
 * Error dictionary mapping error codes to their descriptions.
 * @type {Object.<string, string>}
 */
const ERROR_DICT = {
    '00001': 'Undefined check connection error',

    '00101': 'IP address error',
    '00102': 'Port number error',
    '00103': 'Connection error with license EA',
    '00104': 'Undefined answer from license EA',

    '00301': 'Unknown instrument for broker',
    '00302': 'Instrument not in demo',
    '00304': 'Unknown instrument for broker',

    '00401': 'Instrument not in demo',
    '00402': 'Instrument not exists for broker',

    '00501': 'No instrument defined/configured',

    '01101': 'Undefined check terminal connection error',

    '01201': 'Undefined check MT type error',

    '02001': 'Instrument not in demo',
    '02002': 'Unknown instrument for broker',
    '02003': 'Unknown instrument for broker',
    '02004': 'Time out error',

    '04101': 'Instrument not in demo',
    '04102': 'Wrong/unknown time frame',
    '04103': 'No records',
    '04104': 'Undefined error',
    '04105': 'Unknown instrument for broker',


    '04201': 'Instrument not in demo',
    '04202': 'Wrong/unknown time frame',
    '04204': 'Unknown instrument for broker',

    '04501': 'Instrument not in demo',
    '04502': 'Wrong/unknown time frame',
    '04503': 'No records',
    '04504': 'Missing market instrument',

    '06201': 'Wrong time window',
    '06401': 'Wrong time window',

    
    '07001': 'Trading not allowed, check MT terminal settings',
    '07002': 'Instrument not in demo',
    '07003': 'Instrument not in market watch',
    '07004': 'Instrument not known at broker',
    '07005': 'Unknown order type',
    '07006': 'Wrong SL value',
    '07007': 'Wrong TP value',
    '07008': 'Wrong volume value',
    '07009': 'Error opening / placing order',

    '07101': 'Trading not allowed',
    '07102': 'Position not found/error',

    '07201': 'Trading not allowed',
    '07202': 'Position not found/error',
    '07203': 'Wrong volume',
    '07204': 'Error in partial close',

    '07301': 'Trading not allowed',
    '07302': 'Error in delete',

    '07401': 'Trading not allowed, check MT terminal settings',
    '07402': 'Error check number',
    '07403': 'Position does not exist',
    '07404': 'Opposite position does not exist',
    '07405': 'Both position of same type',

    '07501': 'Trading not allowed',
    '07502': 'Position not open' ,
    '07503': 'Error in modify',

    '07601': 'Trading not allowed',
    '07602': 'Position not open' ,
    '07603': 'Error in modify',

    '07701': 'Trading not allowed',
    '07702': 'Position not open' ,
    '07703': 'Error in modify',

    '07801': 'Trading not allowed',
    '07802': 'Position not open' ,
    '07803': 'Error in modify',

    '07901': 'Trading not allowed',
    '07902': 'Instrument not in demo',
    '07903': 'Order does not exist' ,
    '07904': 'Wrong order type',
    '07905': 'Wrong price',
    '07906': 'Wrong TP value',
    '07907': 'Wrong SL value',
    '07908': 'Check error code',
    '07909': 'Something wrong',

    '08101': 'Unknown global variable',

    '08201': 'Log file not existing',
    '08202': 'Log file empty',
    '08203': 'Error in reading log file',
    '08204': 'Function not implemented',

    '09101': 'Trading not allowed',
    '09102': 'Unknown instrument for broker',
    '09103': 'Function not implemented',

    '99900': 'Wrong authorizaton code',

    '99901': 'Undefined error',

    '99999': 'Dummy'

};

/**
 * jstrader API for MT4 and MT5
 * @class
 */
class JsTraderApi {
    constructor() {
        this.sock = null;
        this.socketError = 0;
        this.socketErrorMessage = '';
        this.orderReturnMessage = '';
        this.orderError = 0;
        this.connected = false;
        this.timeout = false;
        this.commandOK = false;
        this.commandReturnError = '';
        this.debug = false;
        this.version = 'V1.01';
        this.maxBars = 2000;
        this.maxTicks = 2000;
        this.timeoutValue = 10;
        this.instrumentConversionList = {};
        this.instrumentNameBroker = '';
        this.instrumentNameUniversal = '';
        this.dateFrom = new Date('2024-01-01T00:00:00Z');
        this.dateTo = new Date();
        this.instrument = '';
        this.license = 'Demo';
        this.invertArray = false;
        this.authorizationCode = 'None';
    }

    /**
     * Set timeout value for socket communication with MT4 or MT5 EA/Bot.
     * 
     * @param {number} [timeoutInSeconds=60] - The timeout value in seconds.
     * 
     * @returns {Promise<Object>} - List[]
     *  List[0] - bool: status, true or false
     *  List[1] - timeout value
     * @throws {JsTraderApiError} If the socket is not initialized.
     */
    Set_timeout(timeoutInSeconds = 5) {
        this.timeoutValue = timeoutInSeconds;
        if (this.sock) {
            this.sock.setTimeout(this.timeoutValue * 1000);
            return([true, timeoutInSeconds]);
        } else {
            throw new JsTraderApiError('Socket not initialized', 'SOCKET_NOT_INITIALIZED');
        }
    }

    /**
     * Connects to a MT4 or MT5 EA/Bot.
     * 
     * @param {string} [server='127.0.0.1'] - Server IP address.
     * @param {number} [port=1111] - Port number.
     * @param {Object} [instrumentLookup={}] - Dictionary with universal instrument names and broker instrument names.
     *                                         Act as translation table.
     * @param {string} [authorizationCode='None'] - Authorization code for extra security.
     * @returns {Promise<Object>} - List[]
     *  List[0] - bool: status, true or false
     *  List[1] - string: server ip address
     * @throws {JsTraderApiError} If connection fails or instrumentLookup list is empty.
     */
    async connect(server = '127.0.0.1', port = 1111, instrumentLookup = {}, authorizationCode = 'None') {
        
        this.sock = new net.Socket();
        this.sock.setEncoding('utf8');

        this.port = port;
        this.server = server;
        this.instrumentConversionList = instrumentLookup;
        this.authorizationCode = authorizationCode;

        if (Object.keys(this.instrumentConversionList).length === 0) {
            throw new JsTraderApiError('Broker Instrument list not available or empty', 'EMPTY_INSTRUMENT_LIST');
        }

        return new Promise((resolve, reject) => {
            const onError = (err) => {
                this.sock.removeListener('error', onError);
                this.sock.removeListener('connect', onConnected);
                this.connected = false;
                this.socketError = 101;
                this.socketErrorMessage = 'Could not connect to server.';
                reject(new JsTraderApiError(`Connection failed: ${err.message}`, 'CONNECTION_FAILED'));
            };

            const onConnected = () => {
                this.sock.removeListener('error', onError);
                this.sock.removeListener('connect', onConnected);
                this.connected = true;
                this.socketError = 0;
                this.socketErrorMessage = '';
            };

            const onData = (data) => {
                data = '';
                this.sock.removeListener('data', onData);
                resolve([true, server]);
            };

            this.sock.once('error', onError);
            this.sock.once('connect', onConnected);
            this.sock.once('data', onData);

            this.sock.connect(this.port, this.server);

            // Set a timeout for the command
            setTimeout(() => {
                this.sock.removeListener('data', onData);
                this.sock.removeListener('error', onError);
                this.sock.removeListener('error', onError);
                this.socketErrorMessage = ERROR_DICT['00103'];
                this.timeout = true;
                reject(new JsTraderApiError('Command timed out, check server and port', 'COMMAND_TIMEOUT'));
            }, this.timeoutValue * 1000);
        });
    }

    /**
     * Closes the socket connection to a MT4 or MT5 EA bot.
     * 
     * @throws {JsTraderApiError} If the socket is not initialized or an error occurs during disconnection.
     */
    disconnect() {
        if (!this.sock) {
            throw new JsTraderApiError('Socket not initialized', 'SOCKET_NOT_INITIALIZED');
        }

        try {
            this.sock.destroy();
            this.connected = false;
        } catch (error) {
            throw new JsTraderApiError(`Failed to disconnect: ${error.message}`, 'DISCONNECT_FAILED');
        }
    }

    /**
     * Checks if connection with MT terminal/EA bot is still active.
     * @returns {Promise<boolean>}
     * @throws {JsTraderApiError} If the connection check fails, f.i socket not initialized
     */
    async Check_connection() {
        const command = 'F000^1^';
        this.commandReturnError = '';

        try {
            const [ok, dataString] = await this.sendCommand(command);

            if (!ok) {
                this.commandOK = false;
                return false;
            }
            if (this.debug) {
                console.log(dataString);
            }

            const x = dataString.split('^');

            if (x[1] === 'OK') {
                this.timeout = false;
                this.commandOK = true;
                return true;
            } else {
                this.timeout = true;
                this.commandReturnError = ERROR_DICT['99900'];
                this.commandOK = true;
                return false;
            }
        } catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Connection check failed: ${error.message}`, 'CONNECTION_CHECK_FAILED');
        }
    }

    /**
     * Get broker server time.
     * 
     * @returns {Promise<Object>} List[] 
     *  List[0] = status, true or false
     *  List[1] = datetime: Boker time
     * @throws {JsTraderApiError} If the connection fails.
     */
    async Get_broker_server_time()
    {
        this.commandReturnError = '';
        this.command = 'F005^1^';

        try {
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Failed to retrieve server broker time', 'SERVER_BROKER_TIME_RETRIEVAL_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            const x = dataString.split('^');

            if (x[0] === 'F005') {
                this.timeout = false;
                this.command_OK = true;
                const y = x[2].split('-');
                const myDate = new Date();
                myDate.setFullYear(parseInt(y[0]));
                myDate.setMonth(parseInt(y[1])-1);
                myDate.setDate(parseInt(y[2]));
                myDate.setHours(parseInt(y[3]));
                myDate.setMinutes(parseInt(y[4])); 
                myDate.setSeconds(parseInt(y[5]));                         
                return([true, myDate]);
            }

            else {
                this.timeout = true;
                this.commandReturnError = ERROR_DICT['99900'];
                this.commandOK = true;
                throw new JsTraderApiError('Invalid response format', 'INVALID_RESPONSE_FORMAT');
            }
        } catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Failed to retrieve broker server time: ${error.message}`, 'SERVER_BROKER_TIME_RETRIEVAL_FAILED');
        }

    }

    /**
     * Retrieves static account information.
     * 
     * @returns {Promise<Object>} List[] - Account information.
     *  List[0] - bool: status, true or false
     *  List[1] - dict: {name, number, currency, type, leverage, trading_allowed, limit_orders, margin_call, margin_close, company }
     * @throws {JsTraderApiError} If retrieval of account information fails.
     */
    async Get_static_account_info() {
        
        this.command = 'F001^1^';
        this.commandReturnError = '';

        try {
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Failed to retrieve static account information', 'ACCOUNT_INFO_RETRIEVAL_FAILED');
            }

            const x = dataString.split('^');

            if (this.debug) {
                console.log(dataString);
            }

            if (x[0] === 'F001') {
                this.timeout = false;
                this.commandOK = true;
                return [true, {
                    name: x[2],
                    login: x[3],
                    currency: x[4],
                    type: x[5],
                    leverage: x[6],
                    trade_allowed: x[7],
                    limit_orders: x[8],
                    margin_call: x[9],
                    margin_close: x[10],
                    company: x[11]}];
            } else {
                this.timeout = true;
                this.commandReturnError = ERROR_DICT['99900'];
                this.commandOK = true;
                throw new JsTraderApiError('Invalid response format', 'INVALID_RESPONSE_FORMAT');
            }
        } catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Failed to get account info: ${error.message}`, 'STATIC_ACCOUNT_INFO_RETRIEVAL_FAILED');
        }
    }

    /**
     * Retrieves dynamic account information.
     * 
     * @returns {Promise<Object>} List[] - Account information.
     *  List[0] - bool: status, true or false
     *  List[1] - dict: {balance, equity, profit, margin, margin_level, margin_free }
     * @throws {JsTraderApiError} If retrieval of account information fails.
     */
    async Get_dynamic_account_info() {

        const command = 'F002^1^';
        this.commandReturnError = '';

        try {
            const [ok, dataString] = await this.sendCommand(command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Failed to retrieve dynamic account information', 'DYNAMIC_ACCOUNT_INFO_RETRIEVAL_FAILED');
            }
            
            if (this.debug) {
                console.log(dataString);
            }

            const x = dataString.split('^');
            if (x[0] === 'F002') {
                this.timeout = false;
                this.commandOK = true;
                return [true, {
                    balance: x[2],
                    equity: x[3],
                    profit: x[4],
                    margin: x[5],
                    margin_level: x[6],
                    margin_free: x[7],
                }];
            } else {
                this.timeout = true;
                this.commandReturnError = ERROR_DICT['99900'];
                this.commandOK = true;
                throw new JsTraderApiError('Invalid response format', 'INVALID_RESPONSE_FORMAT');
            }
        } catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Failed to get account info: ${error.message}`, 'DYNAMIC_ACCOUNT_INFO_RETRIEVAL_FAILED');
        }
    }

    /**
     * Retrieve instrument info/parameters.
     * 
     * @param {string} [instrumentName] - Name of instrument.
     * @returns {Promise<Object>} - List[boolean, dict]
     *  List[0] - bool: status, true or false
     *  List[1] - dict: {instrument, digits, max_lotsize, min_lotsize, lot_step, point,
     *          tick_size, tick_value, swap_long, swap_short, stop_level, contract_size}
     * @throws {JsTraderApiError} If retrieval of instrument information fails.
     */
    async Get_instrument_info(instrumentName = 'EURUSD') {

        
        this.instrumentNameUniversal = instrumentName;
        const brokerName = this.instrumentConversionList[instrumentName.toUpperCase()];
        if (!brokerName) {
            throw new JsTraderApiError(`Instrument not found: ${this.instrumentNameUniversal}`, 'INSTRUMENT_NOT_FOUND');
        }

        this.instrumentNameBroker = brokerName;
        this.commandReturnError = '';
        this.command = 'F003^2^' + this.instrumentNameBroker + '^';

        try {
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Failed to retrieve instrument information', 'INSTRUMENT_INFO_RETRIEVAL_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            const x = dataString.split('^');
            if (x[0] === 'F003') {
                this.timeout = false;
                this.command_OK = true;
                return([true, {
                    instrument: this.instrumentNameUniversal,
                    digits: x[2],
                    max_lotsize: x[3],
                    min_lotsize: x[4],
                    lot_step: x[5],
                    point: x[6],
                    tick_size: x[7],
                    tick_value: x[8],
                    swap_long: x[9],
                    swap_short: x[10],
                    stop_level: x[11],
                    contract_size: x[12],
                }]);
            } else {
                this.timeout = true;
                this.commandReturnError = ERROR_DICT['99900'];
                this.commandOK = true;
                throw new JsTraderApiError('Invalid response format', 'INVALID_RESPONSE_FORMAT');
            }
        }
        catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Failed to get instrument info: ${error.message}`, 'INSTRUMENT_INFO_RETRIEVAL_FAILED');
        }


    }

    /**
    * Retrieve broker instrument names
    *
    * @returns {Promise<Object>} - List[boolean, string]
    *  List[0] - bool: status, true or false
    *  List[1] - []: List of broker instrument names
    * @throws {JsTraderApiError} If connection fails.
    */
     async Get_broker_instrument_names() {

        this.command = 'F007^1^';
        this.commandReturnError = '';

        try {
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Failed to retrieve broker instrument names', 'BROKER_INSTRUMENT_NAMES_RETRIEVAL_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            let returnList = [];
            let x = dataString.split('^');
            if (x[0] === 'F007') {
                this.timeout = false;
                this.commandOK = true;
                x = x.slice(2, -1);

                returnList = x.map(item => String(item));
                /* for (let j = 0; j < x.length; j++) {
                    returnList.push(x[j]);
                } */
                return [true, returnList];
            } else {
                this.timeout = false;
                this.commandReturnError = ERROR_DICT['99900'];
                this.commandOK = true;
                throw new JsTraderApiError('Invalid response format', 'INVALID_RESPONSE_FORMAT');
            }
        } catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Failed to get broker instrument names: ${error.message}`, 'BROKER_INSTRUMENT_NAMES_RETRIEVAL_FAILED');
        }
    }

    /**
    * Check if instrument is in market watch.
    * 
    * @param {string} [instrumentName] - Name of instrument.
    * @returns {Promise<Object>} - List[boolean, dict]
    *  List[0] - bool: status, true or false
    *  List[1] - string: 'Market watch' or 'Not in market watch'
    * @throws {JsTraderApiError} If connection fails.
    */
    async Check_market_watch(instrumentName = 'EURUSD') {

        this.instrumentNameUniversal = this.instrument;
        const brokerName = this.instrumentConversionList[instrumentName.toUpperCase()];
        if (!brokerName) {
            throw new JsTraderApiError(`Instrument not found: ${this.instrumentNameUniversal}`, 'INSTRUMENT_NOT_FOUND');
        }
        this.instrumentNameBroker = brokerName;
        this.commandReturnError = '';
        this.command = 'F004^2^' + this.instrumentNameBroker + '^';

        try {
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Failed to check instrument market/no market', 'INSTRUMENT_MARKET_CHECK_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            const x = dataString.split('^');
            if (x[0] === 'F004') {
                this.timeout = false;
                this.commandOK = true;
                return [true, x[2]];
            } else {
                this.timeout = false;
                this.commandReturnError = ERROR_DICT['99900'];
                this.commandOK = true;
                throw new JsTraderApiError('Invalid response format', 'INVALID_RESPONSE_FORMAT');
            }
        } catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Failed to check instrument market/no market: ${error.message}`, 'INSTRUMENT_MARKET_CHECK_FAILED');
        }
    }

    /**
    * Check Mt4/MT5 license type
    *
    * @returns {Promise<Object>} - List[boolean, string]
    *  List[0] - bool: status, true or false
    *  List[1] - string: 'Demo' or 'Licensed'
    * @throws {JsTraderApiError} If connection fails.
    */
    async Check_license()
    {
        this.command = 'F006^1^';
        this.commandReturnError = '';
        this.license = 'Demo';

        try {
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Failed to check license', 'LICENSE_CHECK_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            const x = dataString.split('^');
            if (x[0] === 'F006') {
                this.timeout = false;
                this.commandOK = true;
                this.license = x[3    ]
                return [true, x[3]];
            } else {
                this.timeout = false;
                this.commandReturnError = ERROR_DICT['99901'];
                this.commandOK = true;
                throw new JsTraderApiError('Invalid response format', 'INVALID_RESPONSE_FORMAT');
            }
        } catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Failed to check license: ${error.message}`, 'LICENSE_CHECK_FAILED');
        }
    }

    /**
    * Check if for instrument trading is allowed
    * 
    * @param {string} [instrumentName] - Name of instrument.
    * @returns {Promise<Object>} - List[boolean, dict]
    *  List[0] - bool: true or false
    *  List[1] - 'Allowed or 'Not allowed'
    * @throws {JsTraderApiError} If connection fails.
    */
    async Check_trading_allowed(instrumentName = 'EURUSD') {

        this.commandReturnError = '';
        this.instrumentNameBroker = instrumentName;
        const brokerName = this.instrumentConversionList[instrumentName.toUpperCase()];
        if (!brokerName) {
            throw new JsTraderApiError(`Instrument not found: ${this.instrumentNameUniversal}`, 'INSTRUMENT_NOT_FOUND');
        }
        this.instrumentNameBroker = brokerName;

        this.command = 'F008^2^' + this.instrumentNameBroker + '^';

        try {
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Failed to check trading allowed', 'TRADING_ALLOWED_CHECK_FAILED');
            }

            const x = dataString.split('^');
            if (x[0] === 'F008') {
                this.timeout = false;
                this.commandOK = true;
                return [true, x[2]];
            } else {
                this.timeout = false;
                this.commandReturnError = ERROR_DICT['99900'];
                this.commandOK = true;
                throw new JsTraderApiError('Invalid response format', 'INVALID_RESPONSE_FORMAT');
            }
        }
        catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Failed to check trading allowed: ${error.message}`, 'TRADING_ALLOWED_CHECK_FAILED');
        }
    }

    /**
    * Check if MT terminal is connected to the broker server
    *
    * @returns {Promise<Object>} - List[boolean, string]
    *  List[0] - bool: status, true or false
    *  List[1] - string: 'Connected' or 'Not connected'
    * @throws {JsTraderApiError} If connection fails.
    */
    async Check_terminal_server_connection() {

        this.command = 'F011^1^';
        this.commandReturnError = '';

        try {
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Failed to check terminal connected to server', 'TERMINAL_CONNECTED_CHECK_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            const x = dataString.split('^');
            if (x[0] === 'F011') {
                this.timeout = false;
                this.commandOK = true;
                if (x[1] === '1') {
                    return([true, 'Connected']);
                }
                return [true, 'Not connected'];
                //return [true, x[1]];
            } else {
                this.timeout = false;
                this.commandReturnError = ERROR_DICT['99900'];
                this.commandOK = true;
                throw new JsTraderApiError('Invalid response format', 'INVALID_RESPONSE_FORMAT');
            }
        } catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Failed to check terminal connected to server: ${error.message}`, 'TERMINAL_CONNECTED_CHECK_FAILED');
        }
    }

    
    /**
    * Check terminal type MT4 or MT5
    *
    * @returns {Promise<Object>} - List[boolean, string]
    *  List[0] - bool: status, true or false
    *  List[1] - string: MT4 or MT5
    * @throws {JsTraderApiError} If connection fails.
    */
    async Check_terminal_type() {

        this.command = 'F012^1^';
        this.commandReturnError = '';

        try {
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Failed to check terminal type', 'TERMINAL_TYPE_CHECK_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            const x = dataString.split('^');
            if (x[0] === 'F012') {
                this.timeout = false;
                this.commandOK = true;
                if (x[1] === '1') {
                    return([true, 'MT4']);
                }
                return [true, 'MT5'];
            } else {
                this.timeout = false;
                this.commandReturnError = ERROR_DICT['99900'];
                this.commandOK = true;
                throw new JsTraderApiError('Invalid response format', 'INVALID_RESPONSE_FORMAT');
            }
        } catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Failed to check terminal type: ${error.message}`, 'TERMINAL_TYPE_CHECK_FAILED');
        }
    }

    /**
     * Retrieve instrument last tick info.
     * 
     * @param {string} [instrumentName] - Name of instrument.
     * @returns {Promise<Object>} - List[boolean, dict]
     *  List[0] - bool: status, true or false
     *  List[1] - {instrument, date, ask, bid, lst, volume, spread, date_in_ms}
     * @throws {JsTraderApiError} If connection fails or ....
     */
    async Get_last_tick_info(instrumentName = 'EURUSD') {

        this.commandReturnError = '';
        this.instrumentNameUniversal = instrumentName;
        const brokerName = this.instrumentConversionList[instrumentName.toUpperCase()];
        if (!brokerName) {
            throw new JsTraderApiError(`Instrument not found: ${this.instrumentNameUniversal}`, 'INSTRUMENT_NOT_FOUND');
        }
        this.instrumentNameBroker = brokerName;

        this.command = 'F020^2^' + this.instrumentNameBroker + '^';

        try {
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Failed to get last tick info', 'LAST_TICK_INFO_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            const x = dataString.split('^');
            if (x[0] === 'F020') {
                this.timeout = false;
                this.commandOK = true;
                return [true, {

                    instrument: this.instrumentNameUniversal,
                    date: parseInt(x[2]),
                    ask: parseFloat(x[3]),
                    bid: parseFloat(x[4]),
                    last: parseFloat(x[5]),
                    volume: parseInt(x[6]),
                    spread: parseFloat(x[7]),
                    date_in_ms: parseInt(x[8])
                }];
            } else {
                this.timeout = false;
                this.commandReturnError = ERROR_DICT['99900'];
                this.commandOK = true;
                throw new JsTraderApiError('Invalid response format', 'INVALID_RESPONSE_FORMAT');
            }
        } catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Failed to get last tick info: ${error.message}`, 'LAST_TICK_INFO_FAILED');
        }
    }

    /**
     * Retrieve instrument last x tick info.
     * @param {string} [instrumentName] - Name of instrument.
     * @param {number} [nbrOfTicks] - Number of ticks to retrieve.
     * @returns {Promise<Object>} - List[boolean, List[{}]]
     *  List[0] - bool: status, true or false
     *  List[1] - [{dateInMs, ask, bid, last, volume, spread}{}....]
     * @throws {JsTraderApiError} If connection fails or ....
     */
    async Get_last_x_ticks_from_now(instrumentName = 'EURUSD', nbrOfTicks = 100) {

        this.commandReturnError = '';
        this.instrumentNameUniversal = instrumentName;
        const brokerName = this.instrumentConversionList[instrumentName.toUpperCase()];
        if (!brokerName) {
            throw new JsTraderApiError(`Instrument not found: ${this.instrumentNameUniversal}`, 'INSTRUMENT_NOT_FOUND');
        }
        
        this.instrumentNameBroker = brokerName;
        this.nbrOfTicks = nbrOfTicks;
        //this.instrumentNameUniversal = instrumentName;

        if (nbrOfTicks < 1) {
            throw new JsTraderApiError(`NbrOfTicks < 1: ${nbrOfTicks}`, 'INVALID_NBR_OF_TICKS');
        }

        let iLoop = Math.floor(this.nbrOfTicks / this.maxTicks);
        let iTail = this.nbrOfTicks - (this.maxTicks * iLoop);

        try {
            
            if (nbrOfTicks > this.maxTicks) {
                //let iLoop = Math.floor(this.nbrOfTicks / this.maxTicks);
                //let iTail = this.nbrOfTicks - (this.maxTicks * iLoop);

                let allTicks = [];
                for (let i = 0; i < iLoop; i++) {

                    this.command = 'F021^4^' + this.instrumentNameBroker + '^' + (i * this.maxTicks).toString() + '^' + this.maxTicks.toString() + '^';                   
                    const [ok, dataString] = await this.sendCommand(this.command);

                    if (!ok) {
                        this.commandOK = false;
                        throw new JsTraderApiError('Failed to get x tick info', 'X_TICK_INFO_FAILED');
                    }

                    if (this.debug) {
                        console.log(dataString);
                    }
                    let x = dataString.split('^');
                    if (x[0] === 'F021') {
                        this.timeout = false;
                        this.commandOK = true;

                        x = x.slice(2, -1);
                        let ticks = [];
                        for (let j = 0; j < x.length; j++) {
                            const y = x[j].split('$');
                            const newRow = {
                                //index: j + i * this.maxTicks,
                                dateInMs: parseInt(y[0]),
                                ask: parseFloat(y[1]),
                                bid: parseFloat(y[2]),
                                last: parseFloat(y[3]),
                                volume: parseInt(y[4])
                            };
                            ticks.push(newRow);
                        }

                        allTicks = allTicks.concat(ticks);                        
                    }
                    else {
                        this.timeout = false;
                        this.commandReturnError = ERROR_DICT['99900'];
                        this.commandOK = true;
                        throw new JsTraderApiError('Invalid response format', 'INVALID_RESPONSE_FORMAT');
                    }
                }
                if (iTail > 0) {
                    this.command = 'F021^4^' + this.instrumentNameBroker + '^' + (iLoop * this.maxTicks).toString() + '^' + iTail.toString() + '^';

                    const [ok, dataString] = await this.sendCommand(command);

                    if (!ok) {
                        this.commandOK = false;
                        throw new JsTraderApiError('Failed to get x tick info', 'X_TICK_INFO_FAILED');
                    }

                    if (this.debug) {
                        console.log(dataString);
                    }

                    const x = dataString.split('^');
                    if (x[0] === 'F021') {
                        this.timeout = false;
                        this.commandOK = true;

                        x = x.slice(2, -1);
                        let ticks = [];
                        for (let j = 0; j < x.length; j++) {
                            const y = x[j].split('$');
                            const newRow = {
                                //index: j + iLoop * this.maxTicks,
                                dateInMs: parseInt(y[0]),
                                ask: parseFloat(y[1]),
                                bid: parseFloat(y[2]),
                                last: parseFloat(y[3]),
                                volume: parseInt(y[4])
                            };
                            ticks.push(newRow);
                        }
                        allTicks = allTicks.concat(ticks);                        
                    }
                    else {
                        this.timeout = false;
                        this.commandReturnError = ERROR_DICT['99900'];
                        this.commandOK = true;
                        throw new JsTraderApiError('Invalid response format', 'INVALID_RESPONSE_FORMAT');
                    }
                }
                // sort on date
                allTicks.sort(function(a,b){return parseInt(a.dateInMs)- parseInt(b.dateInMs)});
                return [true, allTicks];
            }
            else {

                this.command = 'F021^4^' + this.instrumentNameBroker + '^0^' + this.nbrOfTicks.toString() + '^';
                const [ok, dataString] = await this.sendCommand(this.command);

                if (!ok) {
                    this.commandOK = false;
                    throw new JsTraderApiError('Failed to get x tick info', 'X_TICK_INFO_FAILED');
                }

                if (this.debug) {
                    console.log(dataString);
                }
                
                let x = dataString.split('^');

                if (x[0] === 'F021') {

                        this.timeout = false;
                        this.commandOK = true;

                        x = x.slice(2, -1);
                        let ticks = [];
                        for (let j = 0; j < x.length; j++) {
                            const y = x[j].split('$');
                            const newRow = {
                                //index: j + iLoop * this.maxTicks,
                                dateInMs: parseInt(y[0]),
                                ask: parseFloat(y[1]),
                                bid: parseFloat(y[2]),
                                last: parseFloat(y[3]),
                                volume: parseInt(y[4])
                            };
                            ticks.push(newRow);
                        }
                    
                    // sort on date
                    ticks.sort(function(a,b){return parseInt(a.dateInMs)- parseInt(b.dateInMs)});
                    return([true, ticks]);
                }
                else{
                    this.timeout = false;
                    this.commandReturnError = ERROR_DICT['99900'];
                    this.commandOK = true;
                    throw new JsTraderApiError('Invalid response format', 'INVALID_RESPONSE_FORMAT');
                }
            }
        }
        catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Failed to get x tick info: ${error.message}`, 'X_TICK_INFO_FAILED');
        }                 
    }

    /**
     * Retrieve instrument last bar/candle info.
     * 
     * @param {string} [instrumentName] - Name of instrument.
     * @param {number} [timeFrame=1] - Time frame in MT5 format.
     * @returns {Promise<Object>} - List[boolean, dict]
     *  List[0] - bool: status, true or false
     *  List[1] - {instrument, date, open, high, low, close, volume}
     * @throws {JsTraderApiError} If connection fails or ....
     */
    async Get_actual_bar_info(instrumentName = 'EURUSD', timeFrame = 1) {


        this.commandReturnError = '';
        this.instrumentNameUniversal = instrumentName;
    
        const brokerName = this.instrumentConversionList[instrumentName.toUpperCase()];
        if (!brokerName) {
            throw new JsTraderApiError(`Instrument not found : ${this.instrumentNameUniversal}`, 'INSTRUMENT_NOT_FOUND');
        }
        this.instrumentNameBroker = brokerName;
        this.command = 'F041^3^' + this.instrumentNameBroker + '^' + timeFrame.toString() + '^';

        try {
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Failed to get tick info', 'BAR_INFO_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            const x = dataString.split('^');
            if (x[0] === 'F041') {
                this.timeout = false;
                this.commandOK = true;
                return [true, {
                    instrument: this.instrumentNameUniversal,
                    date: parseInt(x[2]),
                    open: parseFloat(x[3]),
                    high: parseFloat(x[4]),
                    low: parseFloat(x[5]),
                    close: parseFloat(x[6]),
                    volume: parseInt(x[7])
                }];
            } else {
                this.timeout = false;
                this.commandReturnError = ERROR_DICT['99900'];
                this.commandOK = true;
                throw new JsTraderApiError('Invalid response format', 'INVALID_RESPONSE_FORMAT');
            }
        }
        catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Failed to get bar info: ${error.message}`, 'BAR_INFO_FAILED');
        }
    }

    /**
     * Retrieve information for specific bar for list of instrument
     * 
     * @param {string} [[instrumentName, instrumentName, ..]] - Name of instrument.
     * @param {number} [timeFrame=16408] - Time frame in MT5 format.
     * @returns {Promise<Object>} - List[boolean, dict]
     *  List[0] - bool: status, true or false
     *  List[1] - {instrument, date, open, high, low, close, volume}
     * @throws {JsTraderApiError} If connection fails or .....
     */

    async Get_specific_bars_info(instrumentList = ['EURUSD', 'GBPUSD'], specificBarIndex = 5, timeFrame = 16408)
    {

        this.commandReturnError = '';
        this.command = 'F045^3^';
        for(let i = 0; i < instrumentList.length; i++)
        {
            const brokerName = this.instrumentConversionList[instrumentList[i].toUpperCase()];
            if (!brokerName) {
                throw new JsTraderApiError(`Instrument not found: ${instrumentNameUniversal}`, 'INSTRUMENT_NOT_FOUND');
            }
            this.command = this.command + brokerName + '$';            
        }
        this.command = this.command + '^' + specificBarIndex.toString() + '^' + timeFrame.toString() + '^';

        try {
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Failed to get specific bar info', 'SPECIFIC_BAR_INFO_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            let x = dataString.split('^');
            if (x[0] === 'F045')
            {
                x = x.slice(2, -1);
                let bars = [];
                for(let i = 0; i < x.length; i++)
                {
                    const y = x[i].split('$');
                    const newRow = {
                        instrument: y[0],
                        date: parseInt(y[1]),
                        open: parseFloat(y[2]),
                        high: parseFloat(y[3]),
                        low: parseFloat(y[4]),
                        close: parseFloat(y[5]),
                        volume: parseInt(y[6])
                    };
                    bars.push(newRow);
                }
                return [true, bars];
            } else {
                this.timeout = false;
                this.commandReturnError = ERROR_DICT['99900'];
                this.commandOK = true;
                throw new JsTraderApiError('Invalid response format', 'INVALID_RESPONSE_FORMAT');
            }
        }
        catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Failed to get specific bar info: ${error.message}`, 'SPECIFIC_BAR_INFO_FAILED');
        }
    }

     /**
     * Retrieve instrument last x bars/candles info.
     * @param {string} [instrumentName] - Name of instrument.
     * @param {number} [instrumentName] - Time frame.
     * @param {number} [nbrOfBars] - Number of bars to retrieve.
     * @returns {Promise<Object>} - List[boolean, List[{}]]
     *  List[0] - bool: status, true or false
     *  List[1] - [{date, open, high, low, close, volume}{}....]
     * @throws {JsTraderApiError} If connection fails or ....
     */
     async Get_last_x_bars_from_now(instrumentName = 'EURUSD', timeFrame = 5, nbrOfBars = 100) {

        this.commandReturnError = '';
        this.instrumentNameUniversal = instrumentName;

        const brokerName = this.instrumentConversionList[instrumentName.toUpperCase()];
        if (!brokerName) {
            throw new JsTraderApiError(`Instrument not found: ${this.instrumentNameUniversal}`, 'INSTRUMENT_NOT_FOUND');
        }
        this.instrumentNameBroker = brokerName;

        if (nbrOfBars < 1) {
            throw new JsTraderApiError(`NbrOfBars < 1: ${nbrOfBars}`, 'INVALID_NBR_OF_BARS');
        }

        this.nbrOfBars = nbrOfBars;

        let iLoop = Math.floor(this.nbrOfBars / this.maxBars);
        let iTail = this.nbrOfBars - (this.maxBars * iLoop);

        try {            
            if (nbrOfBars > this.maxBars) {

                let allBars = [];
                for (let i = 0; i < iLoop; i++) {

                    this.command = 'F042^5^' + this.instrumentNameBroker + '^' + timeFrame.toString() + '^' + (i * this.maxBars).toString() + '^' + this.maxBars.toString() + '^';                   
                    const [ok, dataString] = await this.sendCommand(this.command);

                    if (!ok) {
                        this.commandOK = false;
                        throw new JsTraderApiError('Failed to get x bar info', 'X_BAR_INFO_FAILED');
                    }

                    if (this.debug) {
                        console.log(dataString);
                    }
                    let x = dataString.split('^');
                    if (x[0] === 'F042') {
                        this.timeout = false;
                        this.commandOK = true;

                        x = x.slice(2, -1);
                        let bars = [];
                        for (let j = 0; j < x.length; j++) {
                            const y = x[j].split('$');
                            const newRow = {
                                //index: j + i * this.maxBars,
                                date: parseInt(y[0]),
                                open: parseFloat(y[1]),
                                high: parseFloat(y[2]),
                                low: parseFloat(y[3]),
                                close: parseFloat(y[4]),
                                volume: parseInt(y[5])
                            };
                            bars.push(newRow);
                        }

                        allBars = allBars.concat(bars);                        
                    }
                    else {
                        this.timeout = false;
                        this.commandReturnError = ERROR_DICT['99900'];
                        this.commandOK = true;
                        throw new JsTraderApiError('Invalid response format', 'INVALID_RESPONSE_FORMAT');
                    }
                }
                if (iTail > 0) {
                    this.command = 'F042^5^' + this.instrumentNameBroker + '^' + timeFrame.toString() + '^' + (iLoop * this.maxBars).toString() + '^' + iTail.toString() + '^';

                    const [ok, dataString] = await this.sendCommand(command);

                    if (!ok) {
                        this.commandOK = false;
                        throw new JsTraderApiError('Failed to get x tick info', 'X_TICK_INFO_FAILED');
                    }

                    if (this.debug) {
                        console.log(dataString);
                    }

                    let x = dataString.split('^');
                    if (x[0] === 'F042') {
                        this.timeout = false;
                        this.commandOK = true;

                        x = x.slice(2, -1);
                        let bars = [];
                        for (let j = 0; j < x.length; j++) {
                            const y = x[j].split('$');
                            const newRow = {
                                //index: j + iLoop * this.maxbars,
                                date: parseInt(y[0]),
                                open: parseFloat(y[1]),
                                high: parseFloat(y[2]),
                                low: parseFloat(y[3]),
                                close: parseFloat(y[4]),
                                volume: parseInt(y[5])
                            };
                            bars.push(newRow);
                        }
                        allBars = allBars.concat(bars);                        
                    }
                    else {
                        this.timeout = false;
                        this.commandReturnError = ERROR_DICT['99900'];
                        this.commandOK = true;
                        throw new JsTraderApiError('Invalid response format', 'INVALID_RESPONSE_FORMAT');
                    }
                }

                allBars.sort(function(a,b){return parseInt(a.date)- parseInt(b.date)});

                return [true, allBars];
            }
            else {

                this.command = 'F042^5^' + this.instrumentNameBroker + '^' + timeFrame.toString() + '^0^' + this.nbrOfBars.toString() + '^';
                const [ok, dataString] = await this.sendCommand(this.command);

                if (!ok) {
                    this.commandOK = false;
                    throw new JsTraderApiError('Failed to get x bars info', 'X_BAR_INFO_FAILED');
                }

                if (this.debug) {
                    console.log(dataString);
                }
                
                let x = dataString.split('^');

                if (x[0] === 'F042') {

                        this.timeout = false;
                        this.commandOK = true;

                        x = x.slice(2, -1);
                        let bars= [];
                        for (let j = 0; j < x.length; j++) {
                            const y = x[j].split('$');
                            const newRow = {
                                //index: j + iLoop * this.maxBars,
                                date: parseInt(y[0]),
                                open: parseFloat(y[1]),
                                high: parseFloat(y[2]),
                                low: parseFloat(y[3]),
                                close: parseFloat(y[4]),
                                volume: parseInt(y[5])
                            };
                            bars.push(newRow);
                        }
                    
                    // sort on date
                    bars.sort(function(a,b){return parseInt(a.date)- parseInt(b.date)});
                    return([true, bars]);
                }
                else{
                    this.timeout = false;
                    this.commandReturnError = ERROR_DICT['99900'];
                    this.commandOK = true;
                    throw new JsTraderApiError('Invalid response format', 'INVALID_RESPONSE_FORMAT');
                }
            }
        }
        catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Failed to get x bar info: ${error.message}`, 'X_BAR_INFO_FAILED');
        }                 
    }

   
    /**
     * Retrieve all pending orders.

     * @returns {Promise<Object>} - List[boolean, List[{}]]
     *  List[0] - bool: status, true or false
     *  List[1] - [{index, ticket, instrument, order_type, magic_number, volume, open_price, stop_loss, take_profit, comment}{}....]
     * @throws {JsTraderApiError} If connection fails or ....
     */
    async Get_all_pending_orders()
    {

        this.commandReturnError= '';
        this.command = 'F060^1^';

        try {
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Failed to get all pending order', 'ALL_PENDING_ORDERS_INFO_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            let x = dataString.split('^');
            if (x[0] === 'F060') {
                this.timeout = false;
                this.commandOK = true;
                const rows = parseInt(x[1]);
                x = x.slice(2,-1);

                if (rows === 0) {
                    return [true, []];
                }

                let orders = [];
                for (let i = 0; i < rows; i++) {
                    const y = x[i].split('$');

                    const newRow = {
                        'ticket': parseInt(y[0]),
                        'instrument': this.getUniversalInstrumentName(y[1]),
                        'order_type': y[2],
                        'magic_number': parseInt(y[3]),
                        'volume': parseFloat(y[4]),
                        'open_price': parseFloat(y[5]),
                        'stop_loss': parseFloat(y[6]),
                        'take_profit': parseFloat(y[7]),
                        'comment': y[8]
                    };

                    orders.push(newRow);
                }
                return([true, orders]);

            } 
            else {
                this.timeout = false;
                this.commandReturnError = ERROR_DICT['99900'];
                this.commandOK = true;
                throw new JsTraderApiError('Invalid response format', 'INVALID_RESPONSE_FORMAT');
            }
        } catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Failed to get all pending orders info: ${error.message}`, 'ALL_PENDING_ORDERS_INFO_FAILED');
        }

    }

    /**
     * Retrieve all open positions.

     * @returns {Promise<Object>} - List[boolean, List[{}]]
     *  List[0] - bool: status, true or false
     *  List[1] - [{index, ticket, instrument, position_type, magic_number, volume, open_price, 
     *      open_time, stop_loss, take_profit, comment, profit, swap, commission}{}....]
     * @throws {JsTraderApiError} If connection fails or ....
     */
    async Get_all_open_positions()
    {

        this.commandReturnError= '';
        this.command = 'F061^1^';

        try {
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Failed to get all open positions', 'ALL_OPEN_POSITIONS_INFO_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            let x = dataString.split('^');
            if (x[0] === 'F061') {
                this.timeout = false;
                this.commandOK = true;
                const rows = parseInt(x[1]);
                x = x.slice(2,-1);

                if (rows === 0) {
                    return [true, []];
                }

                let positions = [];
                for (let i = 0; i < rows; i++) {
                    const y = x[i].split('$');

                    const newRow = {
                        'ticket': parseInt(y[0]),
                        'instrument': this.getUniversalInstrumentName(y[1]),
                        'order_ticket': parseInt(y[2]),
                        'position_type': y[3],
                        'magic_number': parseInt(y[4]),
                        'volume': parseFloat(y[5]),
                        'open_price': parseFloat(y[6]),
                        'open_time': parseInt(y[7]),
                        'stop_loss': parseFloat(y[8]),
                        'take_profit': parseFloat(y[9]),
                        'comment': y[10],
                        'profit': parseFloat(y[11]),
                        'swap': parseFloat(y[12]),
                        'commission': parseFloat(y[13])
                    };

                    positions.push(newRow);
                }
                return([true, positions]);

            } 
            else {
                this.timeout = false;
                this.commandReturnError = ERROR_DICT['99900'];
                this.commandOK = true;
                throw new JsTraderApiError('Invalid response format', 'INVALID_RESPONSE_FORMAT');
            }
        } catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Failed to get all open positions info: ${error.message}`, 'ALL_OPEN_POSITIONS_INFO_FAILED');
        }
    }


    /**
     * Retrieve all closed positions in window.
     * 
     * @param {date}[ dateFrom = new Date('2024-09-18T10:10:10')]  - start date
     * @param {date} [dateTo = new Date.now()] - end date
     * @returns {Promise<Object>} - List[boolean, List[{}]]
     *  List[0] - bool: status, true or false
     *  List[1] - [{index, ticket, instrument, position_type, magic_number, volume, open_price, 
     *      open_time, stop_loss, take_profit, close_price, close_time, comment, profit, 
     *      swap, commission}{}....]
     * @throws {JsTraderApiError} If connection fails or ....
     */
    async Get_all_closed_positions_within_window(dateFrom = new Date('2024-09-18T10:10:10'), dateTo = new Date())
    {

        this.commandReturnError = ''
        this.dateFrom = dateFrom
        this.dateTo = dateTo

        if (this.dateFrom > this.dateTo) {
            this.commandReturnError = 'Date from is after date to';
            throw new JsTraderApiError('Date from is > date to', 'WRONG_DATE_TO_OR_DATE_FROM_VALUE');
        }

        this.command = 'F062^3^' + (this.dateFrom.getFullYear()).toString() + '/' + (this.dateFrom.getMonth()).toString() + '/' + 
                    (this.dateFrom.getDate()).toString() + '/' + (this.dateFrom.getHours()).toString() + '/' + (this.dateFrom.getMinutes()).toString() 
                    + '/' + (this.dateFrom.getSeconds()).toString() + '^' + (this.dateTo.getFullYear()).toString() + '/' + (this.dateTo.getMonth()).toString() + '/' + 
                    (this.dateTo.getDate()).toString() + '/' + (this.dateTo.getHours()).toString() + '/' + (this.dateTo.getMinutes()).toString() 
                    + '/' + (this.dateTo.getSeconds()).toString() + '^';

        try {
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Failed to get all closed positions', 'ALL_CLOSED_POSITIONS_INFO_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            let x = dataString.split('^');

            if (x[0] === 'F062') {
                this.timeout = false;
                this.command_OK = true;
                const rows = parseInt(x[1]);

                if (rows === 0) {
                    return([true, []]);
                }

                // remove first two elements
                x = x.slice(2, -1);
                
                let positions = [];
                for (let i = 0; i < rows; i++) {
                    const y = x[i].split('$');

                    const newRow = {
                        'ticket': parseInt(y[0]),
                        'instrument': this.getUniversalInstrumentName(y[1]),
                        'order_type': y[2],
                        'magic_number': parseInt(y[3]),
                        'volume': parseFloat(y[4]),
                        'open_price': parseFloat(y[5]),
                        'open_time': parseInt(y[6]),
                        'stop_loss': parseFloat(y[7]),
                        'take_profit': parseFloat(y[8]),
                        'close_price': parseFloat(y[9]),
                        'close_time': parseInt(y[10]),
                        'comment': y[11],
                        'profit': parseFloat(y[12]),
                        'swap': parseFloat(y[13]),
                        'commission': parseFloat(y[14])
                    };

                    positions.push(newRow);
                }
                return([true, positions]);
            }
            else {
                this.timeout = false;
                this.commandReturnError = ERROR_DICT['99900'];
                this.commandOK = true;
                throw new JsTraderApiError('Invalid response format', 'INVALID_RESPONSE_FORMAT');
            }

        }
        catch (error) {
        this.commandReturnError = ERROR_DICT['00001'];
        this.commandOK = false;
        throw new JsTraderApiError(`Failed to get all closed positions info: ${error.message}`, 'ALL_CLOSED_POSITIONS_INFO_FAILED');
        }

    }

    /**
     * Retrieve all deleted orders in window.
     * 
     * @param {date}[ dateFrom = new Date('2024-09-18T10:10:10')]  - start date
     * @param {date} [dateTo = new Date.now()] - end date
     * @returns {Promise<Object>} - List[boolean, List[{}]]
     *  List[0] - bool: status, true or false
     *  List[1] - [{index, ticket, instrument, order_type, magic_number, volume, open_price, 
     *      open_time, stop_loss,  delete_price, delete_time, comment }{}....]
     * @throws {JsTraderApiError} If connection fails or ....
     */
    async Get_all_deleted_pending_orders_within_window(dateFrom = new Date('2024-09-18T10:10:10'), dateTo = new Date())
    {
        this.commandReturnError = '';
        this.dateFrom = dateFrom;
        this.dateTo = dateTo;

        if (this.dateFrom > this.dateTo) {
            this.commandReturnError = 'Date from is after date to';
            throw new JsTraderApiError('Date from is > date to', 'WRONG_DATE_TO_OR_DATE_FROM_VALUE');
        }

        this.command = 'F064^3^' + (this.dateFrom.getFullYear()).toString() + '/' + (this.dateFrom.getMonth()).toString() + '/' + 
                    (this.dateFrom.getDate()).toString() + '/' + (this.dateFrom.getHours()).toString() + '/' + (this.dateFrom.getMinutes()).toString() 
                    + '/' + (this.dateFrom.getSeconds()).toString() + '^' + (this.dateTo.getFullYear()).toString() + '/' + (this.dateTo.getMonth()).toString() + '/' + 
                    (this.dateTo.getDate()).toString() + '/' + (this.dateTo.getHours()).toString() + '/' + (this.dateTo.getMinutes()).toString() 
                    + '/' + (this.dateTo.getSeconds()).toString() + '^';

        try {
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Failed to get all deleted orders', 'ALL_DELETED_ORDERS_INFO_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            let x = dataString.split('^');

            if (x[0] === 'F064') {
                this.timeout = false;
                this.command_OK = true;
                const rows = parseInt(x[1]);

                if (rows === 0) {
                    return([true, []]);
                }

                // remove first two elements
                x = x.slice(2, -1);
                
                let orders = [];
                for (let i = 0; i < rows; i++) {
                    const y = x[i].split('$');

                    const newRow = {
                        'ticket': parseInt(y[0]),
                        'instrument': this.getUniversalInstrumentName(y[1]),
                        'order_type': y[2],
                        'magic_number': parseInt(y[3]),
                        'volume': parseFloat(y[4]),
                        'open_price': parseFloat(y[5]),
                        'open_time': parseInt(y[6]),
                        'stop_loss': parseFloat(y[7]),
                        'take_profit': parseFloat(y[8]),
                        'delete_price': parseFloat(y[9]),
                        'delete_time': parseInt(y[10]),
                        'comment': y[11]
                    };

                    orders.push(newRow);
                }
                return([true, orders]);
            }
            else {
                this.timeout = false;
                this.commandReturnError = ERROR_DICT['99900'];
                this.commandOK = true;
                throw new JsTraderApiError('Invalid response format', 'INVALID_RESPONSE_FORMAT');
            }

        }
        catch (error) {
        this.commandReturnError = ERROR_DICT['00001'];
        this.commandOK = false;
        throw new JsTraderApiError(`Failed to get all deleted orders info: ${error.message}`, 'ALL_DELETED_ORDERS_INFO_FAILED');
        }

    }

    /**
     * Retrieve all closed positions.
     * @returns {Promise<Object>} - List[boolean, List[{}]]
     *  List[0] - bool: status, true or false
     *  List[1] - [{index, ticket, instrument, position_type, magic_number, volume, open_price, 
     *      open_time, stop_loss, take_profit, close_price, close_time, comment, profit, 
     *      swap, commission}{}....]
     * @throws {JsTraderApiError} If connection fails or ....
     */
    async Get_all_closed_positions()
    {

        this.commandReturnError = ''
        this.command = 'F063^1^';

        try {
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Failed to get all closed positions', 'ALL_CLOSED_POSITIONS_INFO_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            let x = dataString.split('^');

            if (x[0] === 'F063') {
                this.timeout = false;
                this.command_OK = true;
                const rows = parseInt(x[1]);

                if (rows === 0) {
                    return([true, []]);
                }

                // remove first two elements
                x = x.slice(2, -1);
                
                let positions = [];
                for (let i = 0; i < rows; i++) {
                    const y = x[i].split('$');

                    const newRow = {
                        'ticket': parseInt(y[0]),
                        'instrument': this.getUniversalInstrumentName(y[1]),
                        'order_ticket': parseInt(y[2]),
                        'position_type': y[3],
                        'magic_number': parseInt(y[4]),
                        'volume': parseFloat(y[5]),
                        'open_price': parseFloat(y[6]),
                        'open_time': parseInt(y[7]),
                        'stop_loss': parseFloat(y[8]),
                        'take_profit': parseFloat(y[9]),
                        'close_price': parseFloat(y[10]),
                        'close_time': parseInt(y[11]),
                        'comment': y[12],
                        'profit': parseFloat(y[13]),
                        'swap': parseFloat(y[14]),
                        'commission': parseFloat(y[15])
                    };

                    positions.push(newRow);
                }
                return([true, positions]);
            }
            else {
                this.timeout = false;
                this.commandReturnError = ERROR_DICT['99900'];
                this.commandOK = true;
                throw new JsTraderApiError('Invalid response format', 'INVALID_RESPONSE_FORMAT');
            }

        }
        catch (error) {
        this.commandReturnError = ERROR_DICT['00001'];
        this.commandOK = false;
        throw new JsTraderApiError(`Failed to get all closed positions info: ${error.message}`, 'ALL_CLOSED_POSITIONS_INFO_FAILED');
        }

    }

    /**
     * Retrieve all deleted orders.
     * 
     * @returns {Promise<Object>} - List[boolean, List[{}]]
     *  List[0] - bool: status, true or false
     *  List[1] - [{index, ticket, instrument, order_type, magic_number, volume, open_price, 
     *      open_time, stop_loss,  delete_price, delete_time, comment }{}....]
     * @throws {JsTraderApiError} If connection fails or ....
     */
    async Get_all_deleted_pending_orders()
    {
        this.commandReturnError = '';
        this.command = 'F065^1^';

        try {
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Failed to get all deleted orders', 'ALL_DELETED_ORDERS_INFO_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            let x = dataString.split('^');

            if (x[0] === 'F065') {
                this.timeout = false;
                this.command_OK = true;
                const rows = parseInt(x[1]);

                if (rows === 0) {
                    return([true, []]);
                }

                // remove first two elements
                x = x.slice(2, -1);
                
                let orders = [];
                for (let i = 0; i < rows; i++) {
                    const y = x[i].split('$');

                    const newRow = {
                        'ticket': parseInt(y[0]),
                        'instrument': this.getUniversalInstrumentName(y[1]),
                        'order_type': y[2],
                        'magic_number': parseInt(y[3]),
                        'volume': parseFloat(y[4]),
                        'open_price': parseFloat(y[5]),
                        'open_time': parseInt(y[6]),
                        'stop_loss': parseFloat(y[7]),
                        'take_profit': parseFloat(y[8]),
                        'delete_price': parseFloat(y[9]),
                        'delete_time': parseInt(y[10]),
                        'comment': y[11]
                    };

                    orders.push(newRow);
                }
                return([true, orders]);
            }
            else {
                this.timeout = false;
                this.commandReturnError = ERROR_DICT['99900'];
                this.commandOK = true;
                throw new JsTraderApiError('Invalid response format', 'INVALID_RESPONSE_FORMAT');
            }

        }
        catch (error) {
        this.commandReturnError = ERROR_DICT['00001'];
        this.commandOK = false;
        throw new JsTraderApiError(`Failed to get all deleted orders info: ${error.message}`, 'ALL_DELETED_ORDERS_INFO_FAILED');
        }

    }


    /**
     * Open order
     * @param {string} [[instrumentName, instrumentName, ..]] - Name of instrument.
     * @param {string} [orderType] - buy, sell, buy limit, sell limit, buy stop, sell stop.
     * @param {number} [volume] - order volume.
     * @param {number} [openPrice] - for buy and sell, should be 0.0.
     * @param {number} [slippage] - slippage.
     * @param {number} [magicNumber] - magic number.
     * @param {number} [stopLoss] - stop loss.
     * @param {number} [takeProfit] - take profit.
     * @param {string} [comment] - order comment.
     * @param {boolean} [market] - market instrument.
     * 
     * @returns {Promise<Object>} - List[boolean, number]
     *  List[0] - bool: status, true or false
     *  List[1] - ticket number, -1 = error
     * @throws {JsTraderApiError} If connection fails or .....
     */
    async Open_order(instrumentName = 'EURUSD', orderType = 'buy', volume = 0.01, openPrice = 0.0, slippage = 10, 
        magicNumber = 1000, stopLoss = 0, takeProfit = 0, comment = '', market = false)
    {

        this.commandReturnError = '';
        const brokerName = this.instrumentConversionList[instrumentName.toUpperCase()];
        if (!brokerName) {
            throw new JsTraderApiError(`Instrument not found: ${instrumentNameUniversal}`, 'INSTRUMENT_NOT_FOUND');
        }
        this.instrumentNameBroker = brokerName;
        this.instrumentNameUniversal = instrumentName;

        // check the comment for '^' , '$', '!' character
        // these are not allowed, used as delimiters
        comment.replace('^', '')
        comment.replace('$', '')
        comment.replace('!', '')

        this.command = 'F070^9^' + this.instrumentNameBroker + '^' + orderType + '^' + volume.toString() + '^' 
        + openPrice.toString() + '^' + slippage.toString() + '^' + magicNumber.toString() + '^' + stopLoss.toString() + '^' 
        + takeProfit.toString() + '^' + comment + '^' + market.toString() + '^';

        try {
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Failed to open order', 'OPEN_ORDER_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            const x = dataString.split('^');
            if (x[0] === 'F070') {
                this.timeout = false;
                this.commandOK = true;
                this.orderReturnMessage = x[2];
                this.orderError = x[4];
                return([true, parseInt(x[3])]);
            }
            else{
                this.commandReturnError = ERROR_DICT[x[3]]
                this.commandOK = false
                this.orderReturnMessage = ERROR_DICT[x[3]]
                this.orderError = x[4];
                return([false, -1]);
            }

        }
        catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Failed to open order: ${error.message}`, 'OPEN_ORDER_FAILED');
        }

    }


    /**
     * Close position by ticket.
     * 
     * @param {number} [ticket] - ticket of position.
     * 
     * @returns {Promise<Object>} - List[boolean, number]
     *  List[0] - bool: status, true or false
     *  List[1] - number - ticket]
     * @throws {JsTraderApiError} If connection fails or ....
     */
    async Close_position_by_ticket(ticket = 0)
    {

        this.commandReturnError = '';
        this.command = 'F071^2^' + ticket.toString() + '^';

        try{
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Failed to close position by ticket', 'POSITION_CLOSE_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            const x = dataString.split('^');
            if (x[0] === 'F071')
            {
                this.commandOK = true;
                return([ true, ticket]);            
            }
            else {
                this.commandReturnError = ERROR_DICT[x[3]]
                this.commandOK = false
                this.orderReturnMessage = ERROR_DICT[x[3]]
                this.orderError = x[4]
                return([false, ticket]);
            }
        }
        catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Failed to close position by ticket: ${error.message}`, 'POSITION_CLOSE_FAILED');
        }

    }

    /**
     * Close position partially by ticket.
     * 
     * @param {number} [ticket] - ticket of position.
     * @param {number} [volumeToClose] - volume to close.
     * 
     * @returns {Promise<Object>} - List[boolean, number]
     *  List[0] - bool: status, true or false
     *  List[1] - number - ticket]
     * @throws {JsTraderApiError} If connection fails or ....
     */
    async Close_position_partial_by_ticket(ticket = 0, volumeToClose = 0.01)
    {
        this.commandReturnError = '';
        this.command = 'F072^3^' + ticket.toString() + '^' + volumeToClose.toString() + '^';

        try{
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Failed to close position partly', 'POSITION_PARTLY_CLOSE_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            const x = dataString.split('^');
            if (x[0] === 'F072')
            {
                this.command_OK = true;
                return([ true, ticket]);
            
            }
            else {
                this.commandReturnError = ERROR_DICT[x[3]]
                this.command_OK = false
                this.orderReturnMessage = ERROR_DICT[x[3]]
                this.orderError = x[4]
                return([false, ticket]);
            }
        }
        catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Failed to close position partly: ${error.message}`, 'POSITION_PARTLY_CLOSE_FAILED');
        }


    }

    /**
     * Delete pending order by ticket.
     * 
     * @param {number} [ticket] - ticket of pending order.
     * 
     * @returns {Promise<Object>} - List[boolean, number]
     *  List[0] - bool: status, true or false
     *  List[1] - number - ticket]
     * @throws {JsTraderApiError} If connection fails or ....
     */
    async Delete_pending_order_by_ticket(ticket = 0)
    {
        this.commandReturnError = '';
        this.command = 'F073^2^' + ticket.toString() + '^';

        try{
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Failed to close pending order by ticket', 'PENDING_ORDER_CLOSE_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            const x = dataString.split('^');
            if (x[0] === 'F073')
            {
                this.commandOK = true;
                return([ true, ticket]);            
            }
            else {
                this.commandReturnError = ERROR_DICT[x[3]]
                this.commandOK = false
                this.orderReturnMessage = ERROR_DICT[x[3]]
                this.orderError = x[4]
                return([false, ticket]);
            }
        }
        catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Failed to close position by ticket: ${error.message}`, 'PENDING_ORDER_CLOSE_FAILED');
        }


    }

     /**
     * Close open position by opposite position.
     * 
     * @param {number} [ticket] - ticket of position to close.
     * @param {number} [oppositeTicket] - opposite ticket for closing position.
     * 
     * @returns {Promise<Object>} - List[boolean, number]
     *  List[0] - bool: status, true or false
     *  List[1] - number - ticket]
     * @throws {JsTraderApiError} If connection fails or ....
     */
    async Closeby_position_by_ticket(ticket = 0, oppositeTicket = 0)
    {

        this.commandReturnError = '';
        this.command = 'F074^3^' + ticket.toString() + '^' + oppositeTicket.toString + '^';

        try{
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Failed to close position by opposite position', 'CLOSE_BY_POSITION_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            const x = dataString.split('^');
            if (x[0] === 'F074')
            {
                this.commandOK = true;
                return([ true, ticket]);            
            }
            else {
                this.commandReturnError = ERROR_DICT[x[3]]
                this.commandOK = false
                this.orderReturnMessage = ERROR_DICT[x[3]]
                this.orderError = x[4]
                return([false, ticket]);
            }
        }
        catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Failed to close position by opposite position: ${error.message}`, 'CLOSE_BY_POSITION_FAILED');
        }
    }

    /**
     * Close open positions async, no wait for result.
     * 
     * @param {string} [instrumentName] - instrument name
     *                                  = '***' , all instruments
     * @param {number} [magicNumber] - additional filter for closing.
     * 
     * @returns {Promise<Object>} - List[boolean, null]
     *  List[0] - bool: status, true or false
     * @throws {JsTraderApiError} If connection fails or ....
     */
    async Close_positions_async(instrumentName = '***', magicNumber = -1)
    {

        this.commandReturnError = '';
        if (instrumentName == '***'){
            this.command = 'F091^3^' + instrumentName + '^' + magicNumber.toString() + '^'
        }
        else {
            this.instrumentNameUniversal = instrumentName.toUpperCase()
            const brokerName = this.instrumentConversionList[this.instrumentNameUniversal];
            if (!brokerName) {
                throw new JsTraderApiError(`Instrument not found: ${instrumentNameUniversal}`, 'INSTRUMENT_NOT_FOUND');
            }
            this.instrumentNameBroker = brokerName;
            this.command = 'F091^3^' + str(this.instrumentNameBroker) + '^' + magicNumber.toString() + '^'
        }
        try{
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Failed to close positions async', 'CLOSE_POSITION_ASYNC_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            const x = dataString.split('^');

            if (x[0] === 'F091'){
                this.commandOK = true;
                return ([ true, null]);
            }
            else {
                this.commandReturnError = ERROR_DICT[x[3]]
                this.commandOK = false
                this.orderReturnMessage = ERROR_DICT[x[3]]
                this.orderError = x[4]
                return([false, null]);
            }
        }
        catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Failed to close positions async: ${error.message}`, 'CLOSE_POSITION_ASYNC_FAILED');
        }


    }

    /**
     * Set stop loss and take profit for a position.
     * 
     * @param {number} [ticket] - ticket of position.
     * @param {number} [stopLoss] - stop loss value, if 0.0 no change.
     * @param {number} [takeProfit] - take profit value, if 0.0 no change.
     * 
     * @returns {Promise<Object>} - List[boolean, number]
     *  List[0] - bool: status, true or false
     *  List[1] - number - ticket]
     * @throws {JsTraderApiError} If connection fails or ....
     */
    async Set_sl_and_tp_for_position(ticket = 0, stopLoss = 0.0, takeProfit = 0.0)
    {

        this.commandReturnError = '';
        this.command = 'F075^4^' + ticket.toString() + '^' + stopLoss.toString() + '^' + takeProfit.toString() + '^';

        try{
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Stop loss and take profit setting failed', 'SETTING_SL_TP_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            const x = dataString.split('^');

            if (x[0] === 'F075'){
                this.commandOK = true;
                return ([ true, ticket]);
            }
            else {
                this.commandReturnError = ERROR_DICT[x[3]]
                this.commandOK = false
                this.orderReturnMessage = ERROR_DICT[x[3]]
                this.orderError = x[4]
                return([false, ticket]);
            }
        }
        catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Stop loss and take profit setting failed: ${error.message}`, 'SETTING_SL_TP_FAILED');
        }
        
    }

    /**
     * Set stop loss and take profit for a pending order.
     * 
     * @param {number} [ticket] - ticket of order.
     * @param {number} [stopLoss] - stop loss value, if 0.0 no change.
     * @param {number} [takeProfit] - take profit value, if 0.0 no change.
     * 
     * @returns {Promise<Object>} - List[boolean, number]
     *  List[0] - bool: status, true or false
     *  List[1] - number - ticket]
     * @throws {JsTraderApiError} If connection fails or ....
     */
    async Set_sl_and_tp_for_pending_order(ticket = 0, stopLoss = 0.0, takeProfit = 0.0)
    {
        this.commandReturnError = '';
        this.command = 'F076^4^' + ticket.toString() + '^' + stopLoss.toString() + '^' + takeProfit.toString() + '^';

        try{
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Stop loss and take profit setting failed', 'SETTING_SL_TP_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            const x = dataString.split('^');

            if (x[0] === 'F076'){
                this.commandOK = true;
                return ([ true, ticket]);
            }
            else {
                this.commandReturnError = ERROR_DICT[x[3]]
                this.commandOK = false
                this.orderReturnMessage = ERROR_DICT[x[3]]
                this.orderError = x[4]
                return([false, ticket]);
            }
        }
        catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Stop loss and take profit setting failed: ${error.message}`, 'SETTING_SL_TP_FAILED');
        }

    }

     /**
     * Reset stop loss and take profit for  position.
     * @param {number} [ticket] - ticket of position.
     * 
     * @returns {Promise<Object>} - List[boolean, number]
     *  List[0] - bool: status, true or false
     *  List[1] - number - ticket]
     * @throws {JsTraderApiError} If connection fails or ....
     */
    async Reset_sl_and_tp_for_position(ticket = 0)
    {

        this.commandReturnError = '';
        this.command = 'F077^2^' + ticket.toString() + '^';

        try{
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Reset of stop loss and take profit failed', 'RESET_SL_TP_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            const x = dataString.split('^');

            if (x[0] === 'F077'){
                this.commandOK = true;
                return ([ true, ticket]);
            }
            else {
                this.commandReturnError = ERROR_DICT[x[3]]
                this.commandOK = false
                this.orderReturnMessage = ERROR_DICT[x[3]]
                this.orderError = x[4]
                return([false, ticket]);
            }
        }
        catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Reset of stop loss and take profit failed: ${error.message}`, 'RESET_SL_TP_FAILED');
        }
    }

     /**
     * Reset stop loss and take profit for pending order.
     * 
     * @param {number} [ticket] - ticket of order.
     * 
     * @returns {Promise<Object>} - List[boolean, number]
     *  List[0] - bool: status, true or false
     *  List[1] - number - ticket]
     * @throws {JsTraderApiError} If connection fails or ....
     */
    async Reset_sl_and_tp_for_pending_order(ticket = 0)
    {
        this.commandReturnError = '';
        this.command = 'F078^2^' + ticket.toString() + '^';

        try{
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Reset of stop loss and take profit failed', 'RESET_SL_TP_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            const x = dataString.split('^');

            if (x[0] === 'F078'){
                this.commandOK = true;
                return ([ true, ticket]);
            }
            else {
                this.commandReturnError = ERROR_DICT[x[3]]
                this.commandOK = false
                this.orderReturnMessage = ERROR_DICT[x[3]]
                this.orderError = x[4]
                return([false, ticket]);
            }
        }
        catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Reset of stop loss and take profit failed: ${error.message}`, 'RESET_SL_TP_FAILED');
        }

    }

    /**
     * Change settings of pending order.
     * 
     * @param {number} [ticket] - ticket of order.
     * @param {number} [price] - stop loss value, if -1.0 no change.
     * @param {number} [stopLoss] - stop loss value, if -1.0 no change.
     * @param {number} [takeProfit] - take profit value, if -1.0 no change.
     * 
     * @returns {Promise<Object>} - List[boolean, number]
     *  List[0] - bool: status, true or false
     *  List[1] - number - ticket]
     * @throws {JsTraderApiError} If connection fails or ....
     */
    async Change_settings_for_pending_order(ticket = 0, price = 0.0, stopLoss = 0.0, takeProfit = 0.0)
    {
        this.commandReturnError = '';
        this.command = 'F079^5^' + ticket.toString() + '^' + price.toString() + '^' + stopLoss.toString() + '^' + takeProfit.toString() + '^';
      
        try{
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Change settings of pending order failed', 'CHANGE_PENDING_ORDER_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            const x = dataString.split('^');

            if (x[0] === 'F079'){
                this.commandOK = true;
                return ([ true, ticket]);
            }
            else {
                this.commandReturnError = ERROR_DICT[x[3]]
                this.commandOK = false
                this.orderReturnMessage = ERROR_DICT[x[3]]
                this.orderError = x[4]
                return([false, ticket]);
            }
        }
        catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Change settings of pending order failed: ${error.message}`, 'CHANGE_PENDING_ORDER_FAILED');
        }

    }

    /**
     * Set global variable value.
     * 
     * @param {string} [globalName] - name of global variable, if not exists will be created.
     * @param {number} [globalValue] - value of global variable, should be a real.
     * 
     * @returns {Promise<Object>} - List[boolean, number]
     *  List[0] - bool: status, true or false
     *  List[1] - string - globalName]
     * @throws {JsTraderApiError} If connection fails or ....
     */
    async Set_global_variable(globalName = 'glbTest', globalValue = 0.0)
    {

        this.commandReturnError = '';
        this.command = 'F080^3^' + globalName + '^' + globalValue.toString() + '^';

        try{
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Setting global variable failed', 'SETTING_GLOBAL_VARIABLE_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            const x = dataString.split('^');

            if (x[0] === 'F080'){
                this.commandOK = true;
                return ([ true, globalName]);
            }
            else {
                this.commandReturnError = ERROR_DICT[x[3]]
                this.commandOK = false
                this.orderReturnMessage = ERROR_DICT[x[3]]
                this.orderError = x[4]
                return([false, globalName]);
            }
        }
        catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Setting global variable failed: ${error.message}`, 'SETTING_GLOBAL_VARIABLE_FAILED');
        }     
    }

    /**
     * Get global variable value.
     * 
     * @param {string} [globalName] - name of global variable
     * 
     * @returns {Promise<Object>} - List[boolean, number]
     *  List[0] - bool: status, true or false
     *  List[1] - number - global value]
     * @throws {JsTraderApiError} If connection fails or ....
     */
    async Get_global_variable(globalName = 'glbTest')
    {

        this.commandReturnError = '';
        this.command = 'F081^2^' + globalName + '^';

        try{
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Getting global variable failed', 'GETTING_GLOBAL_VARIABLE_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            const x = dataString.split('^');

            if (x[0] === 'F081'){
                this.commandOK = true;
                return ([true, parseFloat(x[3])]);
            }
            else {
                this.commandReturnError = ERROR_DICT[x[3]]
                this.commandOK = false
                this.orderReturnMessage = ERROR_DICT[x[3]]
                this.orderError = x[4]
                return([false, null]);
            }
        }
        catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Getting global variable failed: ${error.message}`, 'GETTING_GLOBAL_VARIABLE_FAILED');
        }
    }

    /**
     * Switch auto trading on / off.
     * 
     * @param {bool} [onOff] - true = switch on
     * 
     * @returns {Promise<Object>} - List[boolean, null]
     *  List[0] - bool: status, true or false
     *  List[1] - null]
     * @throws {JsTraderApiError} If connection fails or ....
     */
    async Switch_auto_trading_on_off(onOff = true)
    {

        this.commandReturnError = '';
        if (onOff){
            this.command = 'F084^2^On^';
        }
        else{
            this.command = 'F084^2^Off^';
        }
        try{
            const [ok, dataString] = await this.sendCommand(this.command);

            if (!ok) {
                this.commandOK = false;
                throw new JsTraderApiError('Switching autotrading on/off failed', 'SWITCHING_ON_OFF_FAILED');
            }

            if (this.debug) {
                console.log(dataString);
            }

            const x = dataString.split('^');

            if (x[0] === 'F084'){
                this.commandOK = true;
                return ([true, null]);
            }
            else {
                this.commandReturnError = ERROR_DICT[x[3]]
                this.commandOK = false
                this.orderReturnMessage = ERROR_DICT[x[3]]
                this.orderError = x[4]
                return([false, null]);
            }
        }
        catch (error) {
            this.commandReturnError = ERROR_DICT['00001'];
            this.commandOK = false;
            throw new JsTraderApiError(`Switching autotrading on/off failed: ${error.message}`, 'SWITCHING_ON_OFF_FAILED');
        }
    }
  
     /**
     * Sends a command to the MT4/MT5 EA/Bot.
     * @private
     * @param {string} command - The command to send.
     * @returns {Promise<[boolean, string]>}
     * @throws {JsTraderApiError} If the command fails to send or receive a response.
     */
     async sendCommand(command) {
        
        if (!this.sock || !this.sock.writable || this.sock.destroyed) {
            throw new JsTraderApiError('Socket is not writable', 'SOCKET_NOT_WRITABLE');
        }
                
        const fullCommand = `${command}${this.authorizationCode}^!`;
        this.timeout = false;

        return new Promise((resolve, reject) => {
            const onError = (err) => {
                this.timeout = true;
                this.connected = false;
                this.commandReturnError = 'Unexpected socket communication error';
                reject(new JsTraderApiError(`Command failed: ${err.message}`, 'COMMAND_FAILED'));
            };

            this.sock.once('error', onError);

            this.sock.write(fullCommand, 'utf8', (err) => {
                if (err) {
                    this.sock.removeListener('error', onError);
                    reject(new JsTraderApiError(`Failed to send command: ${err.message}`, 'SEND_COMMAND_FAILED'));
                }
            });

            let dataReceived = '';
            const dataHandler = (chunk) => {
                dataReceived += chunk.toString('utf8');
                if (dataReceived.endsWith('!')) {
                    this.sock.removeListener('data', dataHandler);
                    this.sock.removeListener('error', onError);
                    resolve([true, dataReceived]);
                }
            };

            this.sock.on('data', dataHandler);

            // Set a timeout for the command
            setTimeout(() => {
                this.sock.removeListener('data', dataHandler);
                this.sock.removeListener('error', onError);
                this.timeout = true;
                reject(new JsTraderApiError('Command timed out', 'COMMAND_TIMEOUT'));
            }, this.timeoutValue * 1000);
        });
    }

    /**
     * Translates a universal instrument name into the instrument name used by the broker.
     * @param {string} [instrumentNameUniversal='EURUSD'] - The universal instrument name.
     * @returns {string} - The broker's instrument name.
     * @throws {JsTraderApiError} If the instrument is not found in the conversion list.
     */
    getBrokerInstrumentName(instrumentNameUniversal = 'EURUSD') {
        const brokerName = this.instrumentConversionList[instrumentNameUniversal];
        if (!brokerName) {
            throw new JsTraderApiError(`Instrument not found: ${instrumentNameUniversal}`, 'INSTRUMENT_NOT_FOUND');
        }
        return brokerName;
    }

    /**
     * Translates a broker instrument name into the universal instrument name.
     * @param {string} [instrumentNameBroker='EURUSD'] - The broker's instrument name.
     * @returns {string} - The universal instrument name.
     * @throws {JsTraderApiError} If the instrument is not found in the conversion list.
     */
    getUniversalInstrumentName(instrumentNameBroker = 'EURUSD') {
        const universalName = Object.keys(this.instrumentConversionList).find(key => this.instrumentConversionList[key] === instrumentNameBroker);
        if (!universalName) {
            throw new JsTraderApiError(`Instrument not found: ${instrumentNameBroker}`, 'INSTRUMENT_NOT_FOUND');
        }
        return universalName;
    }

    /**
     * Gets the timeframe value for a given timeframe string.
     * @param {string} [timeframe='D1'] - The timeframe string.
     * @returns {number} - The corresponding timeframe value.
     * @throws {JsTraderApiError} If the timeframe is not recognized.
     */
    getTimeframeValue(timeframe = 'D1') {
        const timeframeMap = {
            'MN1': 49153, 'W1': 32769, 'D1': 16408, 'H12': 16396, 'H8': 16392,
            'H6': 16390, 'H4': 16388, 'H3': 16387, 'H2': 16386, 'H1': 16385,
            'M30': 30, 'M20': 20, 'M15': 15, 'M12': 12, 'M10': 10,
            'M6': 6, 'M5': 5, 'M4': 4, 'M3': 3, 'M2': 2, 'M1': 1
        };

        const value = timeframeMap[timeframe.toUpperCase()];
        if (value === undefined) {
            throw new JsTraderApiError(`Unrecognized timeframe: ${timeframe}`, 'INVALID_TIMEFRAME');
        }
        return value;
    }

}

module.exports = JsTraderApi;
