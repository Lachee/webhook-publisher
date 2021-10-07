import { AbstractHost } from "./Hosts/AbstractHost";
import { AbstractPublisher } from "./Publishers/AbstractPublisher";

export class Service {
    
    /**
     * Adds a host to the allowed list of hosts.
     * @param {AbstractHost} host 
     */
    addHost(host) {

    }

    /**
     * 
     * @param {string} protocol The hook protocol that uses this publisher
     * @param {AbstractPublisher} publisher The publisher
     */
    addPublisher(protocol, publisher) {

    }
}