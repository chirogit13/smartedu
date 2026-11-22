import 'package:eschool_saas_staff/data/models/holiday.dart';
import 'package:eschool_saas_staff/utils/api.dart';
import 'package:eschool_saas_staff/utils/hiveBoxKeys.dart';
import 'package:hive_flutter/hive_flutter.dart';

class SettingsRepository {
  Future<void> setOnBoardingScreen(bool value) async {
    Hive.box(settingsBoxKey).put(showOnBoardingScreenKey, value);
  }

  // Future<List<SystemSettingData>> getSystemSettings() async {
  //   try {
  //     final result =
  //         await Api.get(url: Api.getSystemSettings, useAuthToken: false);
  //     return ((result['data'] ?? []) as List)
  //         .map((systemSetting) =>
  //             SystemSettingData.fromJson(Map.from(systemSetting ?? {})))
  //         .toList();
  //   } catch (e) {
  //     throw ApiException(e.toString());
  //   }
  // }

  bool getOnBoardingScreen() {
    return Hive.box(settingsBoxKey).get(showOnBoardingScreenKey) ?? true;
  }

  /// Language the user picked explicitly in the language sheet. Null while the
  /// user never picked one, which is what lets the app follow the panel
  /// default — so this must only be written on an actual user choice.
  String? getSelectedLanguageCode() {
    final languageCode = Hive.box(settingsBoxKey).get(currentLanguageCodeKey);
    return languageCode is String && languageCode.isNotEmpty
        ? languageCode
        : null;
  }

  Future<void> setSelectedLanguageCode(String value) async {
    await Hive.box(settingsBoxKey).put(currentLanguageCodeKey, value);
  }

  /// Hands the app back to the panel default.
  Future<void> clearSelectedLanguageCode() async {
    await Hive.box(settingsBoxKey).delete(currentLanguageCodeKey);
  }

  Future<List<Holiday>> getHolidays() async {
    try {
      final result = await Api.get(url: Api.getHolidays);

      return ((result['data'] ?? []) as List)
          .map((holiday) => Holiday.fromJson(holiday ?? {}))
          .toList();
    } catch (e) {
      throw ApiException(e.toString());
    }
  }

  /// Get settings based on user authentication status
  /// When [isUserLoggedIn] is true, uses authenticated API (school-settings)
  /// When [isUserLoggedIn] is false, uses public API (settings)
  Future<String> getSetting(String type, {required bool isUserLoggedIn}) async {
    try {
      final result = await Api.get(
        url: isUserLoggedIn ? Api.getSchoolSettings : Api.getSettings,
        queryParameters: {"type": type},
        useAuthToken: isUserLoggedIn,
      );
      return result['data'];
    } catch (e) {
      throw ApiException(e.toString());
    }
  }

  Future<Map<String, dynamic>> getAppSettings() async {
    try {
      final result = await Api.get(
          url: Api.getSettings, queryParameters: {"type": "app_settings"});
      return Map.from(result['data'] ?? {});
    } catch (e) {
      throw ApiException(e.toString());
    }
  }
}
