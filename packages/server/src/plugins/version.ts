/**
 * プラグインAPIバージョン管理
 */
import semver from 'semver';

/**
 * 現在のホストプラグインAPIバージョン
 *
 * バージョン更新ポリシー:
 * - MAJOR: 破壊的変更（既存プラグインが動作しなくなる可能性）
 * - MINOR: 後方互換性のある機能追加
 * - PATCH: バグ修正
 */
export const PLUGIN_API_VERSION = '1.0.0';

/**
 * セマンティックバージョン形式の検証
 * @param version バージョン文字列
 * @returns 有効なセマンティックバージョンかどうか
 */
export function isValidSemver(version: string): boolean {
  return semver.valid(version) !== null;
}

/**
 * バージョン互換性チェック結果
 */
export interface VersionCompatibilityResult {
  compatible: boolean;
  currentHostVersion: string;
  requiredMinVersion: string;
  message?: string;
}

/**
 * プラグインのホストバージョン互換性をチェック
 * @param minHostVersion プラグインが要求する最小ホストバージョン
 * @returns 互換性チェック結果
 */
export function checkHostVersionCompatibility(
  minHostVersion: string | undefined
): VersionCompatibilityResult {
  // minHostVersionが未指定の場合は互換性ありとみなす（既存プラグイン対応）
  if (!minHostVersion) {
    return {
      compatible: true,
      currentHostVersion: PLUGIN_API_VERSION,
      requiredMinVersion: 'not specified',
    };
  }

  // セマンティックバージョン形式の検証
  if (!isValidSemver(minHostVersion)) {
    return {
      compatible: false,
      currentHostVersion: PLUGIN_API_VERSION,
      requiredMinVersion: minHostVersion,
      message: `無効なminHostVersion形式: "${minHostVersion}"。セマンティックバージョン形式で指定してください（例: "1.0.0"）`,
    };
  }

  const compatible = semver.gte(PLUGIN_API_VERSION, minHostVersion);

  if (compatible) {
    return {
      compatible: true,
      currentHostVersion: PLUGIN_API_VERSION,
      requiredMinVersion: minHostVersion,
    };
  }

  return {
    compatible: false,
    currentHostVersion: PLUGIN_API_VERSION,
    requiredMinVersion: minHostVersion,
    message: `このプラグインはホストv${minHostVersion}以上が必要ですが、現在のホストバージョンはv${PLUGIN_API_VERSION}です`,
  };
}
