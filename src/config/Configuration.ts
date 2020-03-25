"use strict";
import { workspace, WorkspaceConfiguration } from "vscode";

/**
 * Class to manipulate extension settings
 */
export class Configuration {
  /** configuration */
  private configuration: WorkspaceConfiguration;

  /**
   * extension settings
   */
  constructor(configGroup: string) {
    this.configuration = workspace.getConfiguration(configGroup);
  }

  /**
   * Returns specific setting
   *
   * @param section
   * @param defaultValue
   */
  public get<T>(section: string, defaultValue?: T): T {
    return this.configuration.get<T>(section, defaultValue!);
  }

}