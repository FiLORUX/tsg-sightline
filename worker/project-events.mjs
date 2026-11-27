// Per-project invalidation channel. No project data or credentials on sockets.
export class ProjectEvents {
  constructor(ctx,env){this.ctx=ctx}
  async fetch(request){
    const path=new URL(request.url).pathname;
    if(path==='/subscribe'&&request.headers.get('Upgrade')?.toLowerCase()==='websocket'){
      const pair=new WebSocketPair(),client=pair[0],server=pair[1];
      this.ctx.acceptWebSocket(server);server.serializeAttachment({expires:Date.now()+60000});
      return new Response(null,{status:101,webSocket:client});
    }
    if(path==='/changed'&&request.method==='POST'){
      for(const ws of this.ctx.getWebSockets()){
        try{if((ws.deserializeAttachment()?.expires||0)<=Date.now())ws.close(1000,'Reauthorise');else ws.send('changed')}catch{}
      }
      return new Response(null,{status:204});
    }
    return new Response(null,{status:404});
  }
  webSocketMessage(ws){try{ws.close(1008,'Receive only')}catch{}}
  webSocketClose(ws){try{ws.close(1000)}catch{}}
  webSocketError(ws){try{ws.close(1011)}catch{}}
}
