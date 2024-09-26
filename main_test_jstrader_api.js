const { Console } = require('console');
const JsTraderApi = require('./jstrader_api_V1_01');

const JsTraderApiError = require('./jstrader_api_V1_01');

var LOOKUPTABLE = {

    'EURUSD': 'EURUSD',
    'GBPUSD': 'GBPUSD',
    'UK100': 'UK100',
    'EURAUD': 'EURAUD',
    'EURCHF': 'EURCHF',
    'XAUUSD': 'XAUUSD',
    'GBPJPY': 'GBPJPY',
    'USDCHF': 'USDCHF',
    'EURNZD': 'EURNZD'
}

var _port = 3333;
//var _server = '172.26.176.1';         
var _server = '127.0.0.1';

async function main() {

    const api = new JsTraderApi();

    //--------------------------------------------------
    // In this test program function are commented
    // just uncomment the functions you want to test
    // especially the order functions watch carefully, before you generate to many trades
    // but it is all up to you
    //--------------------------------------------------
    
    try {
        // connect to the MT4/5 EA, by socket
        const connected = await api.connect(server=_server, port = _port, instrumentList = LOOKUPTABLE, authorizationCode = 'None');
        console.log(connected);

        // check the connection
        const checkConnection = await api.Check_connection();
        console.log(checkConnection);

        // set socket time out value
        const timeoutSet = await api.Set_timeout(timeoutInSeconds = 10);
        console.log('Time out set:', timeoutSet);

       /*  // get the time of the broker server
        const brokerServerTime = await api.Get_broker_server_time();
        console.log(brokerServerTime);

        // get the static account info
        const staticAccInfo = await api.Get_static_account_info();
        console.log('Static account Info:', staticAccInfo);
        console.log('Name:', staticAccInfo[1].name);

        // get the dynamic account info
        const dynamicAccInfo = await api.Get_dynamic_account_info();
        console.log('Dynamic account Info:', dynamicAccInfo);
        console.log('Balance:', dynamicAccInfo[1].balance);

        // get instrument info
        const instrumentInfo = await api.Get_instrument_info(instrumentName = 'EURUSD');
        console.log(instrumentInfo);

        // get the broker instrument names
        const instrumentNames = await api.Get_broker_instrument_names();
        console.log(instrumentNames);

        // check for instrument in market watch
        const marketWatch = await api.Check_market_watch('EURUSD');
        console.log(marketWatch);

        // check type of licence, demo or licensed
        const license = await api.Check_license();
        console.log(license);

        // check if trading of instrument is allowed at the moment
        const tradingAllowed = await api.Check_trading_allowed(instrumentName = 'EURUSD');
        console.log(tradingAllowed);


        // check if terminal is MT4 or MT5
        const terminalType = await api.Check_terminal_type();
        console.log(terminalType);

        // check if MT terminal is connected to server
        const terminalConnected = await api. Check_terminal_server_connection();
        console.log(terminalConnected);
 */

/*  
       // get last tick info
        const lastTick = await api.Get_last_tick_info(instrumentName = 'EURUSD');
        console.log(lastTick);


        // get last bar/candle info
        const lastBar = await api.Get_actual_bar_info(instrumentName = 'EURUSD', timeFrame = api.getTimeframeValue('M5'));
        console.log(lastBar);

        // get specific bar for list of instruments
        const specificars = await api.Get_specific_bars_info(instrumentList = [ 'EURUSD', 'GBPUSD'], specificBarIndex = 3, timeFrame = api.getTimeframeValue('M5'));
        console.log(specificars);

        // get the last x ticks
        const lastTicks = await api.Get_last_x_ticks_from_now(instrumentName = 'EURUSD', nbrOfTicks = 100);
        console.log(lastTicks);

        // get the last x bars
        const lastBars = await api.Get_last_x_bars_from_now(instrumentName = 'EURUSD', timeFrame = api.getTimeframeValue('M5'), nbrOfBars = 100);
        console.log(lastBars); 
        
*/

        // open market order, open price should be 0.0
        /* const openOrder = await api.Open_order(instrumentName = 'EURUSD', orderType = 'buy', volume = 0.01, openPrice = 0.0, slippage = 10, magicNumber = 10, 
            stopLoss = 0.0, takeProfit = 0.0, comment = 'test open market', market = true);
        console.log(openOrder); */

        // ticket = 775014284, but for you will be different

        // set stop loss and take profit for a position
        const setSlTp = await api.Set_sl_and_tp_for_position(ticket = 775014284, stopLoss = 1.11, takeProfit = 1.12)
        console.log(setSlTp)

        // reset stop loss and take profit for a position
        const resetSlTp = await api.Reset_sl_and_tp_for_position(ticket = 775014284 );
        console.log(resetSlTp);

        // open pending order
        /* const pendingOrder = await api.Open_order(instrumentName = 'EURUSD', orderType = 'buy_limit', volume = 0.01, openPrice = 1.11, slippage = 10, magicNumber = 10, 
            stopLoss = 0.0, takeProfit = 0.0, comment = 'test open pending', market = true);
        console.log(pendingOrder); */


        // watch tp and sl are absolute values, not pips related to open price
        /* const pendingOrder = await api.Open_order(instrumentName = 'EURUSD', orderType = 'sell_limit', volume = 0.01, openPrice = 1.12, slippage = 10, magicNumber = 10, 
            stopLoss = 1.13, takeProfit = 1.11, comment = 'test open pending', market = true);
        console.log(pendingOrder); */

        /* // change settings for pending order
        const changePending = await api.Change_settings_for_pending_order(ticket = 775031195, price = 1.125, stopLoss = -1.0, takeProfit = -1.0);
        console.log(changePending); */


        // Get all deleted orders
        const deletedOrders = await api.Get_all_deleted_pending_orders();
        console.log(deletedOrders);

        // get all closed positions
        const closedPositions = await api.Get_all_closed_positions();
        console.log(closedPositions);

        // Get all pending orders
        const pendingOrders = await api.Get_all_pending_orders();
        console.log(pendingOrders);

        // Get all open positions
        const openPositions = await api.Get_all_open_positions();
        console.log(openPositions);

        const _date = new Date();
        console.log(_date);
        console.log(_date.getFullYear());

        // get all deleted pending orders in window
        const deletedWindowPendings = await api.Get_all_deleted_pending_orders_within_window(dateFrom = new Date('2024-09-18T10:10:10'), dateTo = new Date());
        console.log(deletedWindowPendings);


        // get all closed positions within window
        const closedWindowPositions = await api.Get_all_closed_positions_within_window(dateFrom = new Date('2024-09-24T10:10:10'), dateTo = new Date());
        console.log(closedWindowPositions);

        // set global variable
        const setGlb = await api.Set_global_variable(globalName = 'glbTest', globalValue = 1.0);
        console.log(setGlb);

        // get global variable
        const getGlb = await api.Get_global_variable(globalName = 'glbTest');
        console.log(getGlb[1]);

        // switch auto trading on off
        const switchOnOff = await api.Switch_auto_trading_on_off(onOff = true);
        console.log(switchOnOff);

    } catch (error) {
        if (error instanceof JsTraderApiError) {
            console.error(`JsTraderApi Error (${error.code}): ${error.message}`);
        } else {
            console.error('Unexpected error:', error);
        }
    } finally {
        api.disconnect();
        console.log('Done');
    }
}

main();