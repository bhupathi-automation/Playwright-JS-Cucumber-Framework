import { Given } from '@cucumber/cucumber';
import { randomUUID } from 'node:crypto';
import { access, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const retryDemoRunId = randomUUID();

Given(
  'I demonstrate a first-attempt failure with {string} resources',
  async function (resourceType) {
    if (resourceType === 'UI' && (!this.browser || !this.context || !this.page || !this.homePage)) {
      throw new Error('UI resources were not initialized for this retry attempt.');
    }
    if (resourceType === 'API' && (!this.requestContext || !this.apiClient)) {
      throw new Error('API resources were not initialized for this retry attempt.');
    }
    if (
      resourceType === 'integration' &&
      (!this.browser || !this.context || !this.page || !this.homePage || !this.apiClient)
    ) {
      throw new Error('UI and API resources were not initialized for this retry attempt.');
    }
    if (!['UI', 'API', 'integration'].includes(resourceType)) {
      throw new Error(`Unsupported retry demo resource type: "${resourceType}".`);
    }

    const markerPath = path.join(
      os.tmpdir(),
      `cucumber-retry-demo-${retryDemoRunId}-${this.__scenarioId}.marker`,
    );
    this.__retryDemoMarkerPath = markerPath;

    let markerExists = true;
    try {
      await access(markerPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        markerExists = false;
      } else {
        throw new Error('Unable to inspect the retry demo marker.', { cause: error });
      }
    }

    if (markerExists) {
      this.log('The scenario is on a retry attempt; its resources were initialized again.');
    } else {
      await writeFile(markerPath, 'first attempt completed', { flag: 'wx' });
      throw new Error('Intentional retry demo failure on the initial attempt.');
    }
  },
);
