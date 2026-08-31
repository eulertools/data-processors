import Web3 from "web3";
import * as AbiCoder from "web3-eth-abi";
import ABI_TOPICS from "./config/abi/events";

const abiCoder:any = AbiCoder;

class AbiUtils {

    public events:Map<string,[]>;

    public constructor() {

        this.events = new Map();

        this.getEvents(ABI_TOPICS).forEach((event) => {

            this.events.set(event.signature,event.inputs);
        });
    }

    public decode(web3:Web3, log:any):any {

        let result;

        const [topic0, ...topicParams] = log.topics

        const method = this.events.get(topic0);

        if(method) {

            try {

                const params = method.filter((element:any) => element.indexed).length
                
                result = web3.eth.abi.decodeLog(this.events.get(topic0)!, log.data, topicParams.slice(0,params))

            } catch (e) {

                console.log(e);
            }
        }

        return result;
    }

    public getEvents(abi:any):any[] {

        const events = abi.filter((e:any) => e.type === 'event' && e.anonymous === false);

        events.forEach((event:any) => {

            event.signature = abiCoder.encodeEventSignature(event);
        });

        return events;
    }

    public getFunctions(abi:any) {

        return abi.filter((e:any) => e.type === 'function');
    }

    public getMethodFromAbi (abi:any, name: string, type: string) {

        const method = abi.find((element:any) => element.name === name && element.type === type);

        return method ? method.inputs : [];
    }
}

const abiUtils = new AbiUtils();

export default abiUtils;
