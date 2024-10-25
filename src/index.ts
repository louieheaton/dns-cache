import dns, { LookupAddress } from 'dns';
import NodeCache from 'node-cache';

const dnsCache = new NodeCache();

dns.lookup = ((hostname, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  const cacheKey = `${hostname}:${JSON.stringify(options)}`;
  const family = (options as { family?: number }).family ?? 4;

  if (dnsCache.get(cacheKey)) {
    // @ts-expect-error
    const address: string & LookupAddress[] = dnsCache.get(cacheKey) as { address: string; family: number };

    return process.nextTick(() => callback(null, address, family));
  }

  const resolveFunction = family === 4 ? dns.resolve4 : dns.resolve6;

  return resolveFunction(hostname, { ttl: true }, (err, addresses) => {
    if (callback) {
      // @ts-expect-error
      const addressMap: string & LookupAddress[] = addresses.map((address) => ({ address: address.address, family }));
      const [{ ttl }] = addresses;

      dnsCache.set(cacheKey, { address: addressMap, family }, ttl);
      callback(err, addressMap, family);
    }
  });
}) as typeof dns.lookup;
