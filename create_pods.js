import { sleep } from "k6";
import encoding from "k6/encoding";
import exec from "k6/execution";
import * as k8s from "./k8s.js";

// Parameters
const namespace = "scalability-test-temp";
const data = encoding.b64encode("a".repeat(1));
const duration = "1m";
const vus = __ENV.VUS || 5;
// 2 requests per iteration, so iteration rate is half of request rate
const rate = (__ENV.RATE || 1) / 2;
const podCount = Number(__ENV.POD_COUNT) || 1;
// Option setting
const kubeconfig = k8s.kubeconfig(__ENV.KUBECONFIG, __ENV.CONTEXT);
const baseUrl = kubeconfig["url"];

export const options = {
  insecureSkipTLSVerify: true,
  tlsAuth: [
    {
      cert: kubeconfig["cert"],
      key: kubeconfig["key"],
    },
  ],

  summaryTrendStats: ["avg", "min", "med", "max", "p(95)", "p(99)", "count"],
  scenarios: {
    createPods: {
      executor: "shared-iterations",
      exec: "createPods",
      vus: vus,
      iterations: podCount,
      maxDuration: "1h",
    },
  },
  thresholds: {
    checks: ["rate>0.99"],
  },
};

// Test functions, in order of execution

export function setup() {
  // delete leftovers, if any
  k8s.del(`${baseUrl}/api/v1/namespaces/${namespace}`);

  // create empty namespace
  const body = {
    metadata: {
      name: namespace,
    },
  };
  k8s.create(`${baseUrl}/api/v1/namespaces`, body);
}

export function createPods(cookies) {
  var body = {
    metadata: {
      namespace: namespace,
      labels: {
        "workload.user.cattle.io/workloadselector": "pod-test-namespace-t1",
      },
      name: `test-pod-${exec.scenario.iterationInTest}`,
      annotations: {},
    },
    spec: {
      containers: [
        {
          imagePullPolicy: "Always",
          name: "container-0",
          volumeMounts: [],
          image: "nginx:alpine",
        },
      ],
      initContainers: [],
      imagePullSecrets: [],
      volumes: [],
      affinity: {},
    },
  };
  k8s.create(`${baseUrl}/api/v1/namespaces/${namespace}/pods`, body, false);
}
