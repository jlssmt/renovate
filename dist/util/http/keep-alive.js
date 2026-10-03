import { HttpAgent, HttpsAgent } from "agentkeepalive";
//#region lib/util/http/keep-alive.ts
const keepAliveAgents = {
	http: new HttpAgent(),
	https: new HttpsAgent()
};
//#endregion
export { keepAliveAgents };

//# sourceMappingURL=keep-alive.js.map