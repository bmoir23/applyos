import { describe, expect, it } from "vitest";

import { isBlockedHostname, isPrivateAddress } from "@/lib/url-safety";

describe("URL safety", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "172.16.10.2",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "::1",
    "fd00::1",
    "::ffff:127.0.0.1",
  ])("blocks private or reserved address %s", (address) => {
    expect(isPrivateAddress(address)).toBe(true);
  });

  it.each(["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])(
    "allows public address %s",
    (address) => {
      expect(isPrivateAddress(address)).toBe(false);
    },
  );

  it.each(["localhost", "service.local", "metadata.google.internal"])(
    "blocks private hostname %s",
    (hostname) => {
      expect(isBlockedHostname(hostname)).toBe(true);
    },
  );
});
