# JsTraderApi

The JsTraderApi is a connection/interface between javascript strategy and a MT4/5 terminal.  The functionality is an anology to our wel known Pytrader_API used by many user strategies coded in python. Besides the JsTraderApi an EA is needed for MT4 and MT5 terminal. These are also part of the system. The demo version has full functionality for the following instruments: EURUSD, AUDCHF, NZDCHF, GBPNZD and USDCAD. Dax is added as index instrument in the demo. The functionality is documented in an .pdf file


A MT4 or MT5 terminal must be running. The appropriate EA must be runnng in one chart. Socket server port and for licensed version the folder with the authentication indicator must be filled in. In demo the system is working full functioning for the above mentioned instrument. The authentication indicator can be acquired via MQL5 Markets.

The socket communication is very fast (interrupt based). The execution time of the function depends on the function and selected broker. The MT terminal acts as server and the JsTraderApi as client, so always question / answer.

Coding examples are available.

For questions we have a Discord Channel.

# Implemented functions

1.	Instantiation.
2.	Connect to server.
3.	Check connection.
4.	Disconnect from MT terminal.
5.	Change time out value.
6.	Get broker server time.
7.	Get static account information.
8.	Get dynamic account information.
9.	Get instrument information.
10.	Get broker instrument names.	
11.	Check instrument in market watch.
12.	Check license type.	
13.	Check trading allowed.
14.	Check terminal type.	
15.	Check terminal server connection.	
16.	Get last tick information.	
17.	Get actual bar information	
18.	Get specific bars.
19.	Get last x ticks from now.
20.	Get last x bars from now.
21.	Open order.
22.	Set stop loss and take profit for position.
23.	Set stop loss and take profit for order (pendings).
24.	Reset stop loss and take profit for position.
25.	Reset stop loss and take profit for pending order.
26.	Change settings for pending order.
27.	Delete pending order.	
28.	Close position.	
29.	Close position partial.	
30.	Close position by opposite position(CloseBy).
31.	Close positions async.
32.	Get all pending orders.
33.	Get all deleted pending orders within window.	
34.	Get all deleted pending orders.	

