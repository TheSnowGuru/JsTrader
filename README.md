# JsTrader

The JsTraderApi is a connection/interface between javascript strategy and a MT4/5 terminal.  The functionality is an anology to our wel known Pytrader_API used by many user strategies coded in python. Besides the JsTraderApi an EA is needed for MT4 and MT5 terminal. These are also part of the system. The demo version has full functionality for the following instruments: EURUSD, AUDCHF, NZDCHF, GBPNZD and USDCAD. Dax is added as index instrument in the demo. The functionality is documented in an .pdf file


A MT4 or MT5 terminal must be running. The appropriate EA must be runnng in one chart. Socket server port and for licensed version the folder with the authentication indicator must be filled in. In demo the system is working full functioning for the above mentioned instrument. The authentication indicator can be acquired via MQL5 Markets.

The socket communication is very fast (interrupt based). The execution time of the function depends on the function and selected broker. The MT terminal acts as server and the PyNinjaTrader_API as client, so always question / answer.

Coding examples are available.

For questions we have a Discord Channel.
