      window.getSunday = function (offset) {
        let d = new Date();
        let day = d.getDay();
        let diff = d.getDate() - day + offset * 7;
        return new Date(d.getFullYear(), d.getMonth(), diff);
      };
      window.formatWeekString = function (sundayDate) {
        let saturdayDate = new Date(sundayDate);
        saturdayDate.setDate(saturdayDate.getDate() + 6);
        return `${sundayDate.getDate()}/${sundayDate.getMonth() + 1} - ${saturdayDate.getDate()}/${saturdayDate.getMonth() + 1}/${saturdayDate.getFullYear()}`;
      };
      window.getWeekDbKey = function (sundayDate) {
        return `week_${sundayDate.getDate()}_${sundayDate.getMonth() + 1}_${sundayDate.getFullYear()}`;
      };
      window.navigateWeek = function (direction) {
        if (window.hasUnsavedChanges && !confirm("יש שינויים שלא נשמרו — לעבור שבוע בלי לשמור?"))
          return;
        window.currentWeekOffset += direction;
        let sun = window.getSunday(window.currentWeekOffset);
        document
          .querySelectorAll(".currentWeekDisplay")
          .forEach((el) => (el.innerText = window.formatWeekString(sun)));
        window.currentSelectedWeek = window.getWeekDbKey(sun);
        if (typeof window.loadWeekFromCloud === "function")
          window.loadWeekFromCloud(window.currentSelectedWeek);
      };

      window.navigateToDate = function (dateStr) {
        if (!dateStr) return;
        if (window.hasUnsavedChanges && !confirm("יש שינויים שלא נשמרו — לעבור לתאריך בלי לשמור?"))
          return;
        const d = new Date(dateStr);
        const dayOfWeek = d.getDay(); // 0=ראשון
        const sunday = new Date(d);
        sunday.setDate(d.getDate() - dayOfWeek);
        // חישוב ה-offset מהשבוע הנוכחי האמיתי
        const todaySun = window.getSunday(0);
        const diffMs = sunday - todaySun;
        const diffWeeks = Math.round(diffMs / (7 * 86400000));
        window.currentWeekOffset = diffWeeks;
        // פתיחת היום שנבחר בתצוגת המובייל — שם היום והניווט בין הימים יתעדכנו לתאריך שנבחר
        window.currentMobileDay = dayOfWeek + 1;
        window._mobileDayInitialized = true;
        const displaySun = window.getSunday(window.currentWeekOffset);
        document
          .querySelectorAll(".currentWeekDisplay")
          .forEach((el) => (el.innerText = window.formatWeekString(displaySun)));
        window.currentSelectedWeek = window.getWeekDbKey(displaySun);
        if (typeof window.loadWeekFromCloud === "function")
          window.loadWeekFromCloud(window.currentSelectedWeek);
      };

      const LOC_MATAL = 'מת"ל';
      const LOC_ZIRA = "זירה";
      const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
      let normalShifts = ["בוקר", "ערב", "לילה"];
      let emergencyShifts = ["24 שעות"];
      let shiftTimes = JSON.parse(localStorage.getItem("shift_times_v47")) || {
        בוקר: "08:30 - 17:30",
        ערב: "12:00 - 20:00",
        לילה: "20:00 - 08:30",
        "24 שעות": "08:00 - 08:00",
      };

      let shiftTimesByLoc =
        JSON.parse(localStorage.getItem("shift_times_byloc_v1")) || null;
      if (!shiftTimesByLoc) {
        shiftTimesByLoc = {
          [LOC_MATAL]: {
            בוקר: shiftTimes["בוקר"],
            לילה: shiftTimes["לילה"],
            "24 שעות": shiftTimes["24 שעות"],
          },
          [LOC_ZIRA]: {
            בוקר: shiftTimes["בוקר"],
            ערב: shiftTimes["ערב"],
            לילה: shiftTimes["לילה"],
          },
        };
      }

      window.getShiftTime = function (loc, shift) {
        // עדיפות: שעות ייחודיות לשבוע > גלובלי > מ-localStorage
        const active = window._weekShiftTimes || shiftTimesByLoc;
        if (active && active[loc] && active[loc][shift])
          return active[loc][shift];
        return shiftTimes[shift] || "";
      };

      const baseLocs = [LOC_MATAL, LOC_ZIRA];
      const weekendShiftsMATAL = [
        "חמישי-לילה",
        "שישי-בוקר",
        "שישי-לילה",
        "שבת-בוקר",
        "שבת-לילה",
      ];
      const weekendShiftsZira = [
        "שישי-בוקר",
        "שישי-לילה",
        "שבת-בוקר",
        "שבת-לילה",
      ];

      let defaultRoleTypes = ["קבינט בכיר", "קבע", "מילואים", "טכנאי", "נחפף"];
      window.roleTypes =
        JSON.parse(localStorage.getItem("shift_roles_v48")) || defaultRoleTypes;

      window.promptNewRole = function () {
        let nr = prompt("הכנס שם דרג חדש:");
        if (nr && nr.trim() !== "" && !window.roleTypes.includes(nr.trim())) {
          window.roleTypes.push(nr.trim());
          localStorage.setItem(
            "shift_roles_v48",
            JSON.stringify(window.roleTypes),
          );
          window.renderRoleFilters();
          alert("דרג חדש נוסף. כעת ניתן לשייך עובדים לדרג זה.");
        }
      };

      const roleMigrationMap = {
        "מנהל א": "קבינט בכיר",
        "מנהל ב": "קבע",
        "מנהל ג": "מילואים",
        "עובד א": "טכנאי",
        "עובד ב": "נחפף",
      };
      window.migrateOldRoles = function () {
        let changed = false;
        if (window.staff) {
          window.staff.forEach((e) => {
            if (roleMigrationMap[e.type]) {
              e.type = roleMigrationMap[e.type];
              changed = true;
            }
          });
        }
        if (window.globalStaff) {
          window.globalStaff.forEach((e) => {
            if (roleMigrationMap[e.type]) {
              e.type = roleMigrationMap[e.type];
              changed = true;
            }
          });
        }
        if (changed && typeof window.saveToCloud === "function") {
          window.saveToCloud("staffMaster", window.globalStaff);
          window.saveToCloud(
            "schedules/" + window.currentSelectedWeek + "/staff",
            window.staff,
          );
        }
        let rulesStr = localStorage.getItem("shift_rules_v47");
        if (rulesStr) {
          Object.keys(roleMigrationMap).forEach((old) => {
            rulesStr = rulesStr
              .split(`"${old}"`)
              .join(`"${roleMigrationMap[old]}"`);
          });
          window.rules = JSON.parse(rulesStr);

          if (
            window.rules[LOC_ZIRA] &&
            window.rules[LOC_ZIRA]["weekday_לילה"] &&
            !window.rules[LOC_ZIRA]["weekday_לילה"].roles.includes("נחפף")
          ) {
            window.rules[LOC_ZIRA]["weekday_לילה"].roles.push("נחפף");
          }
          if (
            window.rules[LOC_MATAL] &&
            window.rules[LOC_MATAL]["weekday_לילה"] &&
            !window.rules[LOC_MATAL]["weekday_לילה"].roles.includes("נחפף")
          ) {
            window.rules[LOC_MATAL]["weekday_לילה"].roles.push("נחפף");
          }
          localStorage.setItem("shift_rules_v47", JSON.stringify(window.rules));
        }
      };

      const defaultRules = {
        [LOC_MATAL]: {
          weekday_בוקר: {
            count: 0,
            roles: ["טכנאי", "קבע", "מילואים"],
            required: {},
            note: "",
          },
          weekday_ערב: { count: 0, roles: ["טכנאי"], required: {}, note: "" },
          weekday_לילה: { count: 2, roles: ["טכנאי"], required: {}, note: "" },
          weekend: { count: 2, roles: ["טכנאי"], required: {}, note: "" },
          "weekday_24 שעות": { count: 2, roles: ["טכנאי", "נחפף"], required: {}, note: "" },
        },
        [LOC_ZIRA]: {
          weekday_בוקר: {
            count: 0,
            roles: ["קבע", "מילואים", "טכנאי"],
            required: {},
            note: "",
          },
          weekday_ערב: {
            count: 2,
            roles: ["קבע", "מילואים", "טכנאי"],
            required: { קבע: 1 },
            note: "",
          },
          weekday_לילה: {
            count: 1,
            roles: ["טכנאי", "קבע", "מילואים"],
            required: {},
            note: "",
          },
          weekend: { count: 2, roles: ["נחפף"], required: {}, note: "" },
        },
      };

      window.rules = JSON.parse(localStorage.getItem("shift_rules_v47"));
      if (
        !window.rules ||
        !window.rules[LOC_MATAL] ||
        !window.rules[LOC_ZIRA]
      ) {
        window.rules = JSON.parse(JSON.stringify(defaultRules));
        localStorage.setItem("shift_rules_v47", JSON.stringify(window.rules));
      }
      // הבטחת קיום weekday_בוקר למשתמשים קיימים
      [LOC_MATAL, LOC_ZIRA].forEach((loc) => {
        if (!window.rules[loc]["weekday_בוקר"]) {
          window.rules[loc]["weekday_בוקר"] = {
            count: 0,
            roles: defaultRules[loc]["weekday_בוקר"].roles,
            required: {},
            note: "",
          };
        }
      });
      // הבטחת קיום weekday_24 שעות למת"ל למשתמשים קיימים
      if (!window.rules[LOC_MATAL]["weekday_24 שעות"]) {
        window.rules[LOC_MATAL]["weekday_24 שעות"] = {
          count: 2,
          roles: ["טכנאי", "נחפף"],
          required: {},
          note: "",
        };
      }

      window.emRotations = JSON.parse(
        localStorage.getItem("shift_em_rotations_v47"),
      ) || {
        zira: [
          { full: ["פפו", "סתיו"], part: ["דוד"] },
          { full: ["אביחי", "כפיר"], part: ["עוז"] },
          { full: ["לירן", "דייב"], part: ["שגיא"] },
        ],
        m200: [
          {
            manager: "זיו",
            workers: ["אביב", "ליאור", "יותם", "אילי", "איתי א"],
          },
          {
            manager: "אסף",
            workers: ["ליאם", "דוראל", "דורון", "איתי ז", "נועם"],
          },
          { manager: "עוז ש", workers: ["עידו", "אבי", "עוז"] },
        ],
      };

      window.staff = [];
      window.globalStaff = [];
      window.currentLocFilter = "all";
      window.currentRoleFilter = "all";
      window.selectedEmployees = new Set();
      window.currentSchedule = {
        isPublished: false,
        special: {},
        dailyNotes: {},
      };
      window.currentNotesLog = {};
      window.draggedData = null;
      window.isEditMode = false;
      window.isEmergencyMode =
        JSON.parse(localStorage.getItem("shift_emergency_v47")) || false;
      window.isDarkMode =
        JSON.parse(localStorage.getItem("shift_darkmode_v47")) || false;
      window.currentShifts = window.isEmergencyMode
        ? emergencyShifts
        : normalShifts;
      window.holidays =
        JSON.parse(localStorage.getItem("shift_holidays_v47")) || [];

      window.isHoliday = (d) =>
        !window.isEmergencyMode && window.holidays.includes(d);
      window.isOffDay = (d) =>
        !window.isEmergencyMode &&
        (d === "שישי" || d === "שבת" || window.isHoliday(d));

      window.taskCategories = JSON.parse(
        localStorage.getItem("shift_task_categories_v47"),
      ) || ["חלוקת מזון", 'אבט"ש', "חניונים"];
      window.systemTasks =
        JSON.parse(localStorage.getItem("shift_tasks_v47")) || [];
      window.currentId = null;
      window.isWorkerMode = false;
      window.hasUnsavedChanges = false;
      window.currentMobileDay = 1;
      window.holidaysLog = [];

      window.commanders = JSON.parse(
        localStorage.getItem("shift_commanders_v1"),
      ) || [
        { id: 1, name: "אביחי כהן", phone: "0522911379" },
        { id: 2, name: "פפו", phone: "0542042421" },
      ];

      // הגדרת האם להציע שליחת וואטסאפ (localStorage כברירת מחדל, Firebase יכסה)
      const _rawWa = localStorage.getItem("shift_wa_enabled_v1");
      window.waPromptEnabled = _rawWa !== "false";

      // הגדרות כלליות
      window.appSettings = JSON.parse(
        localStorage.getItem("shift_app_settings_v1"),
      ) || {
        maxShiftsPerWeek: 5,
        autoFillDefault: true,
        showWeekendJustice: true,
      };

      // נתוני הוגנות סופ"ש
      window.weekendHistory =
        JSON.parse(localStorage.getItem("shift_weekend_history_v1")) || {};

      window.lastPendingCount = null;

      window.requestNotifPermission = function () {
        if (!("Notification" in window)) return;
        if (Notification.permission === "default") {
          Notification.requestPermission().then((perm) => {
            if (perm === "granted") {
              new Notification("✅ התראות הופעלו!", {
                body: "תקבל התראה בכל פעם שעובד מגיש בקשה.",
                icon: "https://cdn-icons-png.flaticon.com/512/3652/3652191.png",
                dir: "rtl",
              });
            }
          });
        } else if (Notification.permission === "denied") {
          alert("⚠️ התראות חסומות בדפדפן.\nכדי להפעיל: לחץ על המנעול בשורת הכתובת ← אשר התראות.");
        } else if (Notification.permission === "granted") {
          // Already granted — send a test notification
          new Notification("🔔 התראות פעילות", {
            body: "מערכת ההתראות פועלת כראוי.",
            dir: "rtl",
          });
        }
      };

      window.testNotification = function () {
        if (!("Notification" in window)) {
          alert("הדפדפן שלך אינו תומך בהתראות.");
          return;
        }
        if (Notification.permission !== "granted") {
          window.requestNotifPermission();
        } else {
          new Notification("🔔 בדיקת התראה", {
            body: "התראות פועלות תקין במערכת המשמרות.",
            icon: "https://cdn-icons-png.flaticon.com/512/3652/3652191.png",
            dir: "rtl",
          });
        }
      };

      window.fireNewRequestNotif = function (req) {
        if (
          !("Notification" in window) ||
          Notification.permission !== "granted"
        )
          return;
        const typeMap = {
          vacation: "יום חופש 🌴",
          constraint: "אילוץ ⏳",
          shift: "בקשת שיבוץ 🎯",
        };
        const typeStr = typeMap[req.type] || "בקשה";
        const title = `📋 בקשה חדשה - ${req.empName}`;
        const body = `${typeStr} ביום ${req.day || ""} — נדרש אישורך`;
        const notifOptions = {
          body,
          icon: "https://cdn-icons-png.flaticon.com/512/3652/3652191.png",
          tag: "req-" + req.id,
          requireInteraction: true,
          dir: "rtl",
          vibrate: [200, 100, 200],
        };

        // שימוש ב-serviceWorker.ready — עובד גם כשהטאב ברקע (PWA מותקן)
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready
            .then((reg) => reg.showNotification(title, notifOptions))
            .catch(() => {
              if (document.visibilityState !== "hidden")
                new Notification(title, notifOptions);
            });
        } else {
          new Notification(title, notifOptions);
        }
      };

      window.triggerUnsavedChanges = function () {
        window.hasUnsavedChanges = true;
        const saveBtn = document.getElementById("cloudSaveWarningBtn");
        if (saveBtn && !window.isWorkerMode) {
          saveBtn.style.display = "inline-flex";
        }
        if (typeof window.renderTable === "function")
          window.renderTable(window.currentSchedule, window.currentNotesLog);
      };

      window.commitChangesToCloud = function () {
        if (typeof window.saveToCloud !== "function") return;
        window.currentSchedule.staff = window.staff;
        const wk = window.currentSelectedWeek;

        // שלב השמירה בפועל (מופעל אחרי שקראנו את המצב הישן לצורך ההתראות)
        const finishSave = () => {
          // שמור עותק מדויק של מה שנשלח לענן — ה-onValue יקרא אותו ולא יחליף בנתוני Firebase
          window._pendingCloudData = {
            weekKey: wk,
            data: JSON.parse(JSON.stringify(window.currentSchedule)),
          };
          window.saveToCloud("schedules/" + wk, window.currentSchedule);

          // גיבוי אוטומטי — תמונת מצב של השבוע עם חותמת זמן (היסטוריית גרסאות)
          if (typeof window.saveScheduleBackup === "function")
            window.saveScheduleBackup(wk, window.currentSchedule);

          let weekendWorkers = new Set();
          // חמישי-לילה נחשב סופ"ש רק במת"ל (לא בזירה)
          const locWeekendMap = [
            { loc: LOC_MATAL, shifts: weekendShiftsMATAL },
            { loc: LOC_ZIRA, shifts: weekendShiftsZira },
          ];
          locWeekendMap.forEach(({ loc, shifts }) => {
            shifts.forEach((sk) => {
              let [d, s] = sk.split("-");
              const slot = window.currentSchedule[`${d}-${s}`];
              if (slot && slot[loc]) {
                slot[loc].forEach((emp) => weekendWorkers.add(emp.id));
              }
            });
          });
          // גם עובדים שמסומנים ידנית כ"ישובץ לסופ"ש" — נחשבים כעובדי סופ"ש לשבוע הבא
          window.staff.forEach((emp) => {
            if (emp.isNextWeekend) weekendWorkers.add(emp.id);
          });

          let nextSun = window.getSunday(window.currentWeekOffset + 1);
          let nextWeekKey = window.getWeekDbKey(nextSun);
          window.saveToCloud(
            "schedules/" + nextWeekKey + "/autoWorkedLastWeekend",
            Array.from(weekendWorkers),
          );

          if (typeof window.updateWeekendHistory === "function")
            window.updateWeekendHistory();
          window.hasUnsavedChanges = false;
          const saveBtn = document.getElementById("cloudSaveWarningBtn");
          if (saveBtn) saveBtn.style.display = "none";
          alert('🔒 הלוח נשמר! חוקי הסופ"ש קודמו אוטומטית לשבוע הבא.');
        };

        // התראות שינוי משמרת — משווים מול המצב ששמור בענן (אמין), לפני הדריסה
        if (
          window.currentSchedule.isPublished &&
          window._fbImports &&
          window._firebaseDb &&
          typeof window.computeAssignmentMap === "function"
        ) {
          const { ref, get } = window._fbImports;
          const newMap = window.computeAssignmentMap(window.currentSchedule);
          const weekLabel = window.formatWeekString(
            window.getSunday(window.currentWeekOffset || 0),
          );
          get(ref(window._firebaseDb, "schedules/" + wk))
            .then((snap) => {
              const oldMap = window.computeAssignmentMap(
                snap.exists() ? snap.val() : {},
              );
              window._generateShiftChangeNotifs(oldMap, newMap, wk, weekLabel);
            })
            .catch((e) => console.warn("חישוב התראות נכשל:", e))
            .finally(finishSave);
        } else {
          finishSave();
        }
      };

      window.togglePublish = function () {
        if (!window.currentSchedule) window.currentSchedule = {};
        window.currentSchedule.isPublished =
          !window.currentSchedule.isPublished;
        window.triggerUnsavedChanges();
      };

      // ===== מערכת התראות שינוי משמרות =====

      // מפת שיבוצים: לכל מזהה עובד — רשימת "יום|משמרת|מיקום" שהוא משובץ בהם
      window.computeAssignmentMap = function (sched) {
        const map = {};
        if (!sched) return map;
        const allShifts = ["בוקר", "ערב", "לילה", "24 שעות"];
        days.forEach((day) => {
          allShifts.forEach((shift) => {
            const slot = sched[`${day}-${shift}`];
            if (!slot) return;
            baseLocs.forEach((loc) => {
              const arr = slot[loc];
              if (!Array.isArray(arr)) return;
              arr.forEach((emp) => {
                if (emp == null || emp.id == null) return;
                (map[emp.id] = map[emp.id] || []).push(
                  `${day}|${shift}|${loc}`,
                );
              });
            });
          });
        });
        return map;
      };

      // השוואת מצב ישן לחדש — כתיבת התראה לכל עובד שהשתנו לו המשמרות
      window._generateShiftChangeNotifs = function (
        oldMap,
        newMap,
        weekKey,
        weekLabel,
      ) {
        const ids = new Set([
          ...Object.keys(oldMap || {}),
          ...Object.keys(newMap || {}),
        ]);
        const fmt = (s) => s.split("|").join(" ");
        ids.forEach((id) => {
          const oldSet = new Set((oldMap && oldMap[id]) || []);
          const newSet = new Set((newMap && newMap[id]) || []);
          const added = [...newSet].filter((x) => !oldSet.has(x));
          const removed = [...oldSet].filter((x) => !newSet.has(x));
          if (added.length === 0 && removed.length === 0) return;
          const record = {
            weekKey,
            weekLabel: weekLabel || "",
            ts: Date.now(),
            added: added.map(fmt),
            removed: removed.map(fmt),
          };
          // נשמר לפי שבוע — שמירה חוזרת מעדכנת ולא מצברת התראות כפולות
          window.saveToCloud(
            "shiftChangeNotifs/" + id + "/" + weekKey,
            record,
          );
        });
      };

      // האזנה להתראות של העובד המחובר (שינויי משמרת + סטטוס בקשות)
      window._shiftNotifUnsub = null;
      window._myReqUnsub = null;
      window.subscribeShiftNotifs = function (empId) {
        if (empId == null || !window._fbImports || !window._firebaseDb) return;
        const { ref, onValue } = window._fbImports;
        if (window._shiftNotifUnsub) {
          try {
            window._shiftNotifUnsub();
          } catch (e) {}
        }
        window._shiftNotifUnsub = onValue(
          ref(window._firebaseDb, "shiftChangeNotifs/" + empId),
          (snap) => {
            window._myShiftNotifs = snap.exists() ? snap.val() || {} : {};
            window.renderShiftChangeBanner();
          },
        );
        // האזנה לבקשות העובד וסטטוסן
        if (window._myReqUnsub) {
          try {
            window._myReqUnsub();
          } catch (e) {}
        }
        window._myReqUnsub = onValue(
          ref(window._firebaseDb, "myRequests/" + empId),
          (snap) => {
            window._myRequests = snap.exists() ? snap.val() || {} : {};
            window.renderShiftChangeBanner();
            if (typeof window.renderMyRequestsList === "function")
              window.renderMyRequestsList();
          },
        );
      };

      // עובדים הם קריאה-בלבד — סימון "נקרא" נשמר מקומית (localStorage) לפי תחום
      window._dismissStore = function (ns) {
        const id =
          (window.loggedInWorker && window.loggedInWorker.id) ||
          (window.loggedInUser && window.loggedInUser.id);
        return "dismiss_" + ns + "_" + (id == null ? "x" : id);
      };
      window._getDismissed = function (ns) {
        try {
          return JSON.parse(localStorage.getItem(window._dismissStore(ns))) || {};
        } catch (e) {
          return {};
        }
      };
      window._setDismissedItem = function (ns, key, val) {
        const d = window._getDismissed(ns);
        d[key] = val;
        try {
          localStorage.setItem(window._dismissStore(ns), JSON.stringify(d));
        } catch (e) {}
      };

      // תיאור מפורט של בקשה (סוג, תאריך, יום, משמרת, מיקום)
      window._reqDesc = function (r) {
        const dateStr = r.date ? r.date.split("-").reverse().join(".") : "";
        const typeStr =
          r.type === "vacation"
            ? "🌴 יום חופש מלא"
            : r.type === "constraint"
              ? "⏳ אילוץ"
              : "🎯 העדפת שיבוץ";
        let parts = [typeStr];
        if (dateStr)
          parts.push(`📅 ${dateStr}${r.day ? " (" + r.day + ")" : ""}`);
        if (r.type !== "vacation" && r.shift) parts.push(`משמרת: ${r.shift}`);
        if (
          r.type === "shift" &&
          r.loc &&
          typeof window.getLocName === "function"
        )
          parts.push(`מיקום: ${window.getLocName(r.loc)}`);
        return parts.join(" · ");
      };

      // באנר התראות לעובד — שינויי משמרת + החלטות על בקשות
      // התראות מוצגות עד שסוגרים אותן, ולכל היותר 24 שעות (ואז נעלמות אוטומטית)
      window.NOTIF_EXPIRY_MS = 24 * 60 * 60 * 1000;

      window.renderShiftChangeBanner = function () {
        const el = document.getElementById("shiftChangeBanner");
        if (!el) return;
        const now = Date.now();
        let cards = "";
        let count = 0;

        // 1. שינויי משמרת
        const notifs = window._myShiftNotifs || {};
        const dShift = window._getDismissed("shift");
        Object.keys(notifs)
          .map((k) => Object.assign({ key: k }, notifs[k]))
          .filter(
            (n) =>
              n &&
              n.ts &&
              dShift[n.key] !== n.ts &&
              now - n.ts < window.NOTIF_EXPIRY_MS,
          )
          .sort((a, b) => (b.ts || 0) - (a.ts || 0))
          .forEach((n) => {
            count++;
            let lines = "";
            if (n.added && n.added.length)
              lines += `<div style="color:#15803d; font-size:0.88rem; margin-top:3px;">➕ נוסף: ${n.added.join(" · ")}</div>`;
            if (n.removed && n.removed.length)
              lines += `<div style="color:#b91c1c; font-size:0.88rem; margin-top:3px;">➖ הוסר: ${n.removed.join(" · ")}</div>`;
            cards += `<div style="background:#fff; border-right:4px solid #f59e0b; border-radius:8px; padding:10px 14px; margin-bottom:8px; box-shadow:0 2px 6px rgba(0,0,0,0.12);">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                <div><b style="color:#b45309;">🔔 עודכנו לך המשמרות</b> <span style="color:#64748b; font-size:0.8rem;">${n.weekLabel || ""}</span>${lines}</div>
                <button onclick="window.dismissShiftNotif('${n.key}')" title="הבנתי" style="background:none; border:none; font-size:1.1rem; cursor:pointer; color:#94a3b8; line-height:1;">✕</button>
              </div>
            </div>`;
          });

        // 2. החלטות על בקשות (אושרו / נדחו) — עם פירוט מלא
        const reqs = window._myRequests || {};
        const dReq = window._getDismissed("req");
        Object.keys(reqs)
          .map((k) => Object.assign({ key: k }, reqs[k]))
          .filter(
            (r) =>
              r &&
              r.date &&
              r.type &&
              (r.status === "approved" || r.status === "rejected") &&
              r.statusTs &&
              dReq[r.key] !== r.statusTs &&
              now - r.statusTs < window.NOTIF_EXPIRY_MS,
          )
          .sort((a, b) => (b.statusTs || 0) - (a.statusTs || 0))
          .forEach((r) => {
            count++;
            const ok = r.status === "approved";
            const color = ok ? "#15803d" : "#b91c1c";
            const title = ok ? "✅ הבקשה שלך אושרה" : "❌ הבקשה שלך נדחתה";
            const noteLine = r.note
              ? `<div style="font-size:0.82rem; margin-top:3px; color:#64748b;">📝 ${r.note}</div>`
              : "";
            cards += `<div style="background:#fff; border-right:4px solid ${color}; border-radius:8px; padding:10px 14px; margin-bottom:8px; box-shadow:0 2px 6px rgba(0,0,0,0.12);">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                <div><b style="color:${color};">${title}</b><div style="font-size:0.88rem; margin-top:3px; color:#334155;">${window._reqDesc(r)}</div>${noteLine}</div>
                <button onclick="window.dismissRequestNotif('${r.key}')" title="הבנתי" style="background:none; border:none; font-size:1.1rem; cursor:pointer; color:#94a3b8; line-height:1;">✕</button>
              </div>
            </div>`;
          });

        if (count === 0) {
          el.style.display = "none";
          el.innerHTML = "";
          return;
        }
        // כותרת עם "נקה הכל" כשיש יותר מהתראה אחת
        const header =
          count > 1
            ? `<div style="display:flex; justify-content:flex-end; margin-bottom:6px;">
                 <button onclick="window.dismissAllNotifs()" style="background:#475569; color:#fff; border:none; border-radius:14px; padding:4px 14px; font-size:0.8rem; font-weight:bold; cursor:pointer;">נקה הכל (${count}) ✕</button>
               </div>`
            : "";
        el.innerHTML = header + cards;
        el.style.display = "block";
      };

      window.dismissShiftNotif = function (weekKey) {
        const n = (window._myShiftNotifs || {})[weekKey];
        if (!n) return;
        window._setDismissedItem("shift", weekKey, n.ts);
        window.renderShiftChangeBanner();
      };

      window.dismissRequestNotif = function (reqId) {
        const r = (window._myRequests || {})[reqId];
        if (!r) return;
        window._setDismissedItem("req", reqId, r.statusTs);
        window.renderShiftChangeBanner();
      };

      // סגירת כל ההתראות המוצגות בבת אחת
      window.dismissAllNotifs = function () {
        const notifs = window._myShiftNotifs || {};
        Object.keys(notifs).forEach((k) => {
          if (notifs[k] && notifs[k].ts)
            window._setDismissedItem("shift", k, notifs[k].ts);
        });
        const reqs = window._myRequests || {};
        Object.keys(reqs).forEach((k) => {
          const r = reqs[k];
          if (
            r &&
            (r.status === "approved" || r.status === "rejected") &&
            r.statusTs
          )
            window._setDismissedItem("req", k, r.statusTs);
        });
        window.renderShiftChangeBanner();
      };

      // רשימת הבקשות של העובד וסטטוסן (בעמוד הגשת הבקשות)
      window.renderMyRequestsList = function () {
        const cont = document.getElementById("myRequestsList");
        if (!cont) return;
        const reqs = window._myRequests || {};
        const arr = Object.keys(reqs)
          .map((k) => reqs[k])
          .filter((r) => r && r.date && r.type) // התעלם מרשומות לא תקינות
          .sort((a, b) => (b.ts || 0) - (a.ts || 0));
        if (arr.length === 0) {
          cont.innerHTML =
            "<i style='color:var(--md-text-secondary)'>עדיין לא הגשת בקשות.</i>";
          return;
        }
        let html = "";
        arr.forEach((r) => {
          const badge =
            r.status === "approved"
              ? `<span style="background:#dcfce7; color:#15803d; padding:3px 10px; border-radius:12px; font-size:0.8rem; font-weight:bold; white-space:nowrap;">✅ אושרה</span>`
              : r.status === "rejected"
                ? `<span style="background:#fee2e2; color:#b91c1c; padding:3px 10px; border-radius:12px; font-size:0.8rem; font-weight:bold; white-space:nowrap;">❌ נדחתה</span>`
                : `<span style="background:#fef3c7; color:#b45309; padding:3px 10px; border-radius:12px; font-size:0.8rem; font-weight:bold; white-space:nowrap;">⏳ ממתינה</span>`;
          html += `<div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:10px 4px; border-bottom:1px solid var(--md-divider);">
            <div><div style="font-weight:500;">${window._reqDesc(r)}</div>${r.note ? `<div style="font-size:0.8rem; color:var(--md-text-secondary); margin-top:2px;">📝 ${r.note}</div>` : ""}</div>
            ${badge}
          </div>`;
        });
        cont.innerHTML = html;
      };

      // ===== גיבוי אוטומטי ושחזור =====
      window.BACKUPS_TO_KEEP = 10; // כמה גרסאות לשמור לכל שבוע

      // שמירת תמונת מצב של השבוע עם חותמת זמן + גיזום ישנות
      window.saveScheduleBackup = function (weekKey, sched) {
        if (!weekKey || !sched || typeof window.saveToCloud !== "function")
          return;
        try {
          const ts = Date.now();
          const snap = JSON.parse(JSON.stringify(sched));
          snap._backupMeta = {
            ts,
            label: new Date(ts).toLocaleString("he-IL"),
          };
          window.saveToCloud(`backups/${weekKey}/${ts}`, snap);
          window.pruneBackups(weekKey);
        } catch (e) {
          console.warn("גיבוי נכשל:", e);
        }
      };

      // השארת BACKUPS_TO_KEEP הגרסאות האחרונות בלבד
      window.pruneBackups = function (weekKey) {
        if (!window._fbImports || !window._firebaseDb) return;
        const { ref, get, remove } = window._fbImports;
        get(ref(window._firebaseDb, `backups/${weekKey}`))
          .then((snap) => {
            if (!snap.exists()) return;
            const keys = Object.keys(snap.val())
              .map(Number)
              .sort((a, b) => a - b);
            const extra = keys.length - window.BACKUPS_TO_KEEP;
            for (let i = 0; i < extra; i++)
              remove(ref(window._firebaseDb, `backups/${weekKey}/${keys[i]}`));
          })
          .catch(() => {});
      };

      // הצגת רשימת הגיבויים לשבוע הנבחר
      window.renderBackupsList = function () {
        const cont = document.getElementById("backupsListContainer");
        if (!cont) return;
        if (!window._fbImports || !window._firebaseDb) {
          cont.innerHTML = "<i>רכיב הענן לא נטען.</i>";
          return;
        }
        const weekKey = window.currentSelectedWeek;
        const weekLabel = window.formatWeekString(
          window.getSunday(window.currentWeekOffset || 0),
        );
        const { ref, get } = window._fbImports;
        cont.innerHTML = "<i>טוען...</i>";
        get(ref(window._firebaseDb, `backups/${weekKey}`))
          .then((snap) => {
            if (!snap.exists()) {
              cont.innerHTML = `<i style="color:var(--md-text-secondary);">אין גיבויים לשבוע ${weekLabel}. גיבוי נוצר אוטומטית בכל שמירה לענן.</i>`;
              return;
            }
            const val = snap.val();
            const keys = Object.keys(val)
              .map(Number)
              .sort((a, b) => b - a);
            let html = `<div style="font-size:0.85rem; color:var(--md-text-secondary); margin-bottom:8px;">שבוע ${weekLabel} — ${keys.length} גרסאות שמורות:</div>`;
            keys.forEach((k) => {
              const meta = (val[k] && val[k]._backupMeta) || {};
              const label = meta.label || new Date(k).toLocaleString("he-IL");
              html += `<div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:8px 10px; border-bottom:1px solid var(--md-divider);">
                <span style="font-size:0.9rem;">🕒 ${label}</span>
                <button class="btn btn-outlined" style="padding:4px 12px; font-size:0.8rem; border-color:var(--md-primary); color:var(--md-primary);" onclick="window.restoreBackup('${weekKey}', ${k})">שחזר</button>
              </div>`;
            });
            cont.innerHTML = html;
          })
          .catch((e) => {
            cont.innerHTML = "<i>שגיאה בטעינת הגיבויים.</i>";
            console.warn(e);
          });
      };

      // שחזור גרסה — טוען למסך (לא נשמר עד שהמנהל לוחץ שמור)
      window.restoreBackup = function (weekKey, ts) {
        if (
          !confirm(
            "לשחזר את הגרסה הזו?\nהלוח שעל המסך יוחלף בגרסה השמורה — אך זה לא יישמר עד שתלחץ 'שמור לענן'.",
          )
        )
          return;
        const { ref, get } = window._fbImports;
        get(ref(window._firebaseDb, `backups/${weekKey}/${ts}`))
          .then((snap) => {
            if (!snap.exists()) {
              alert("הגיבוי לא נמצא.");
              return;
            }
            const data = snap.val();
            delete data._backupMeta;
            window.currentSchedule = data;
            if (Array.isArray(data.staff)) window.staff = data.staff;
            if (typeof window.recomputeNotesFromSchedule === "function")
              window.recomputeNotesFromSchedule();
            if (typeof window.renderStaff === "function") window.renderStaff();
            window.triggerUnsavedChanges();
            if (typeof window.renderTable === "function")
              window.renderTable(window.currentSchedule, window.currentNotesLog);
            window.showPage("schedule");
            alert(
              "✅ הגרסה שוחזרה למסך.\nבדוק שהכל תקין ולחץ 'שמור לענן' כדי להחיל.",
            );
          })
          .catch((e) => alert("שגיאה בשחזור: " + (e.message || e)));
      };

      // הורדת גיבוי מלא של כל הנתונים לקובץ JSON (גיבוי חיצוני)
      window.downloadFullBackup = function () {
        if (!window._fbImports || !window._firebaseDb) {
          alert("רכיב הענן לא נטען.");
          return;
        }
        const { ref, get } = window._fbImports;
        get(ref(window._firebaseDb, "/"))
          .then((snap) => {
            const data = snap.exists() ? snap.val() : {};
            // ללא תיקיית הגיבויים עצמה — כדי לא לנפח את הקובץ
            if (data.backups) delete data.backups;
            const blob = new Blob([JSON.stringify(data, null, 2)], {
              type: "application/json",
            });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `shifts_backup_${new Date().toISOString().split("T")[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          })
          .catch((e) => alert("שגיאה בהורדת הגיבוי: " + (e.message || e)));
      };

      window.loggedInUser = null;
      window.currentUserRole = null;

      // ===== שמירת התחברות ל-15 דקות =====
      window.SESSION_DURATION_MS = 15 * 60 * 1000; // 15 דקות

      window.saveSession = function (data) {
        try {
          let keep = document.getElementById("keepMeLoggedIn");
          if (keep && !keep.checked) {
            localStorage.removeItem("shift_session_v1");
            return;
          }
          localStorage.setItem(
            "shift_session_v1",
            JSON.stringify({ ...data, ts: Date.now() }),
          );
        } catch (e) {
          console.error("session save failed", e);
        }
      };

      window.clearSession = function () {
        try {
          localStorage.removeItem("shift_session_v1");
        } catch (e) {}
      };

      window.getValidSession = function () {
        try {
          let raw = localStorage.getItem("shift_session_v1");
          if (!raw) return null;
          let s = JSON.parse(raw);
          if (!s.ts || Date.now() - s.ts > window.SESSION_DURATION_MS) {
            localStorage.removeItem("shift_session_v1");
            return null;
          }
          return s;
        } catch (e) {
          return null;
        }
      };

      // ניסיון התחברות אוטומטית (נקרא לאחר טעינת רשימת העובדים)
      window.tryAutoLogin = function () {
        if (window.loggedInUser || window.isWorkerMode) return; // כבר מחובר
        let s = window.getValidSession();
        if (!s) return;
        if (!window.globalStaff || window.globalStaff.length === 0) return;
        // רענון חלון 15 הדקות בכל פתיחה מחדש
        window.saveSession(s);

        if (s.kind === "manager") {
          if (s.uid === ADMIN_UID) {
            window.currentUserRole = "superAdmin";
            let realEmp = window.globalStaff.find(
              (e) => e.personalId === s.uid,
            );
            window.loggedInUser = realEmp
              ? realEmp
              : {
                  id: "super",
                  name: "אביחי (מנהל ראשי)",
                  systemRole: "superAdmin",
                };
            finishLogin();
          } else {
            let emp = window.globalStaff.find((e) => e.personalId === s.uid);
            if (emp) {
              window.loggedInUser = emp;
              window.currentUserRole = emp.systemRole || "worker";
              finishLogin();
            }
          }
        } else if (s.kind === "worker") {
          let emp = window.globalStaff.find((e) => e.id == s.empId);
          if (emp) {
            window.isWorkerMode = true;
            window.loggedInWorker = emp;
            window.loggedInUser = emp;
            document.body.classList.add("worker-view");
            document.getElementById("loginOverlay").style.display = "none";
            const wl = document.getElementById("workerLoginDiv");
            if (wl) wl.style.display = "none";
            const ml = document.getElementById("mainLoginBtns");
            if (ml) ml.style.display = "flex";
            const reqSelector = document.getElementById("reqEmpSelector");
            if (reqSelector) {
              reqSelector.innerHTML = `<option value="${emp.id}">${emp.name}</option>`;
              reqSelector.setAttribute("disabled", "true");
              reqSelector.style.background = "#e2e8f0";
            }
            if (typeof window.subscribeShiftNotifs === "function")
              window.subscribeShiftNotifs(emp.id);
            window.showPage("schedule");
            if (typeof window.renderTable === "function")
              window.renderTable(
                window.currentSchedule,
                window.currentNotesLog,
              );
          }
        }
      };

      // אימות מנהל ראשי — הסיסמה אינה שמורה בקוד, רק טביעת אצבע (SHA-256) שלה.
      // ניתן להחליף סיסמה דרך window.changeAdminPassword (הערך החדש נשמר בענן וגובר על הקבוע).
      const ADMIN_UID = "8326560";
      const ADMIN_SALT = "shifts-ta26-admin-v1";
      const ADMIN_HASH_FALLBACK =
        "bae8a7cef3e9c7e59ba52a8815ec066e2e715503b968a8ad2fff16bafe72fd20";

      window._sha256Hex = async function (str) {
        const buf = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(str),
        );
        return Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      };

      window.changeAdminPassword = async function () {
        if (window.currentUserRole !== "superAdmin") {
          alert("רק מנהל ראשי יכול להחליף את סיסמת המנהל.");
          return;
        }
        const cur = prompt("הסיסמה הנוכחית:");
        if (!cur) return;
        const curHash = await window._sha256Hex(
          `${ADMIN_UID}:${cur.trim()}:${ADMIN_SALT}`,
        );
        const effective = window.adminHashOverride || ADMIN_HASH_FALLBACK;
        if (curHash !== effective) {
          alert("הסיסמה הנוכחית שגויה.");
          return;
        }
        const next = prompt("סיסמה חדשה (לפחות 8 תווים, רצוי אותיות ומספרים):");
        if (!next || next.trim().length < 8) {
          alert("הסיסמה החדשה קצרה מדי — נדרשים לפחות 8 תווים.");
          return;
        }
        const nextHash = await window._sha256Hex(
          `${ADMIN_UID}:${next.trim()}:${ADMIN_SALT}`,
        );
        // עדכון סיסמת חשבון ה-Firebase (כדי שהרשאת הכתיבה תמשיך לעבוד)
        let fbMsg = "";
        if (typeof window.fbAdminSignIn === "function") {
          try {
            await window.fbAdminSignIn(cur.trim()); // אימות מחדש לפני שינוי סיסמה
            await window.fbUpdateAdminPassword(next.trim());
          } catch (e) {
            if (e && e.code === "auth/user-not-found")
              fbMsg =
                "\n(חשבון המנהל ב-Firebase טרם הוקם — הפעל 'הקם הרשאת כתיבה' בהגדרות)";
            else
              fbMsg = "\n(שים לב: עדכון סיסמת ההרשאה ב-Firebase נכשל: " + (e && e.code) + ")";
          }
        }
        window.adminHashOverride = nextHash;
        if (typeof window.saveToCloud === "function")
          window.saveToCloud("settings/adminHash", nextHash);
        alert("✅ סיסמת המנהל הוחלפה ונשמרה בענן." + fbMsg);
      };

      // הקמה חד-פעמית של חשבון המנהל ב-Firebase (מקנה הרשאת כתיבה לענן)
      window.setupManagerWriteAccess = async function () {
        if (window.currentUserRole !== "superAdmin") {
          alert("רק מנהל ראשי יכול להקים הרשאת כתיבה.");
          return;
        }
        if (typeof window.fbCreateAdmin !== "function") {
          alert("שגיאה: רכיב ההזדהות לא נטען.");
          return;
        }
        const pw = prompt(
          "בחר סיסמה חזקה וחדשה למנהל הראשי (לפחות 8 תווים).\n" +
            "זו תהיה הסיסמה שלך לכניסה למערכת מעכשיו:",
        );
        if (!pw || pw.trim().length < 8) {
          alert("הסיסמה קצרה מדי — נדרשים לפחות 8 תווים.");
          return;
        }
        const pass = pw.trim();
        try {
          await window.fbCreateAdmin(pass);
          // החשבון נוצר — כעת מחוברים אליו (הרשאת כתיבה פעילה)
        } catch (e) {
          if (e && e.code === "auth/email-already-in-use") {
            // החשבון כבר קיים — ננסה להתחבר עם הסיסמה שהוזנה
            try {
              await window.fbAdminSignIn(pass);
            } catch (e2) {
              alert(
                "חשבון המנהל כבר קיים אך הסיסמה שהוזנה אינה תואמת.\n" +
                  "הזן את הסיסמה הקיימת של החשבון, או אפס אותה בקונסולת Firebase.",
              );
              return;
            }
          } else if (e && e.code === "auth/operation-not-allowed") {
            alert(
              "יש להפעיל קודם את שיטת ההתחברות 'Email/Password' בקונסולת Firebase\n" +
                "(Authentication → Sign-in method → Email/Password → Enable).",
            );
            return;
          } else {
            alert("שגיאה בהקמת חשבון המנהל: " + (e && (e.code || e.message)));
            return;
          }
        }
        // סנכרון ה-hash המקומי לסיסמה החדשה
        const nextHash = await window._sha256Hex(
          `${ADMIN_UID}:${pass}:${ADMIN_SALT}`,
        );
        window.adminHashOverride = nextHash;
        if (typeof window.saveToCloud === "function")
          window.saveToCloud("settings/adminHash", nextHash);
        alert(
          "✅ הרשאת הכתיבה הוקמה!\n\n" +
            "מעכשיו תיכנס עם המספר האישי והסיסמה החדשה.\n" +
            "השלב האחרון: הדבק את חוקי האבטחה המעודכנים בקונסולה (database.rules.json).",
        );
      };

      window.processLogin = async function () {
        let uid = document.getElementById("loginUsername").value.trim();
        let pass = document.getElementById("loginPassword").value.trim();
        if (!uid || !pass) {
          alert("נא להזין שם משתמש וסיסמה.");
          return;
        }

        // 1. התחברות מנהל ראשי — השוואת טביעת אצבע, ללא סיסמה גלויה בקוד
        if (uid === ADMIN_UID) {
          // ניסיון התחברות מנהל מול Firebase — מקנה הרשאת כתיבה לענן
          let fbOk = false;
          if (typeof window.fbAdminSignIn === "function") {
            try {
              await window.fbAdminSignIn(pass);
              fbOk = true;
            } catch (e) {
              fbOk = false; // חשבון המנהל טרם הוקם / סיסמה שונה — נופלים לבדיקת ה-hash
            }
          }
          const tryHash = await window._sha256Hex(
            `${uid}:${pass}:${ADMIN_SALT}`,
          );
          const effective = window.adminHashOverride || ADMIN_HASH_FALLBACK;
          if (fbOk || tryHash === effective) {
            window.currentUserRole = "superAdmin";
            // חיבור הפרופיל הראשי לכרטיסיה האמיתית במסד הנתונים
            let realEmp = window.globalStaff.find((e) => e.personalId === uid);
            window.loggedInUser = realEmp
              ? realEmp
              : {
                  id: "super",
                  name: "אביחי (מנהל ראשי)",
                  systemRole: "superAdmin",
                };
            window.saveSession({ kind: "manager", uid });
            if (!fbOk)
              console.warn(
                "מנהל מחובר ללא הרשאת כתיבה ב-Firebase — יש להקים את חשבון המנהל.",
              );
            finishLogin();
            return;
          }
        }

        // 2. התחברות לכל שאר העובדים או המנהלים המשניים
        let emp = window.globalStaff.find(
          (e) => e.personalId === uid && e.password === pass,
        );
        if (emp) {
          window.loggedInUser = emp;
          window.currentUserRole = emp.systemRole || "worker";
          window.saveSession({ kind: "manager", uid });
          finishLogin();
        } else {
          alert(
            "שם משתמש או סיסמה שגויים.\nשים לב: שם המשתמש הוא המספר האישי שלך.",
          );
        }
      };

      window.doWorkerLogin = function () {
        let empId = document.getElementById("loginWorkerSelect").value;
        let passInput = document.getElementById("loginWorkerPass").value;
        if (!empId) {
          alert("אנא בחר את שמך מהרשימה!");
          return;
        }

        let emp = window.globalStaff.find((e) => e.id == empId);
        let actualPass = emp.password || "1234";

        if (passInput === actualPass) {
          window.isWorkerMode = true;
          window.loggedInWorker = emp;
          window.loggedInUser = emp;
          window.currentUserRole = "worker";
          // עובד תמיד אנונימי מול Firebase — קריאה בלבד (גם אם לפניו היה מנהל באותו דפדפן)
          if (typeof window.fbGoAnonymous === "function") window.fbGoAnonymous();
          window.saveSession({ kind: "worker", empId: emp.id });

          document.body.classList.add("worker-view");
          document.getElementById("loginOverlay").style.display = "none";
          document.getElementById("workerLoginDiv").style.display = "none";
          document.getElementById("mainLoginBtns").style.display = "flex";
          document.getElementById("loginWorkerPass").value = "";

          if (typeof window.populateWorkerRequestNames === "function")
            window.populateWorkerRequestNames();

          if (typeof window.subscribeShiftNotifs === "function")
            window.subscribeShiftNotifs(emp.id);

          window.showPage("schedule");
          if (typeof window.renderTable === "function")
            window.renderTable(window.currentSchedule, window.currentNotesLog);
        } else {
          alert(
            "סיסמה שגויה! (ברירת המחדל לכולם היא 1234. אם שכחת, פנה למנהל)",
          );
        }
      };

      function finishLogin() {
        document.getElementById("loginOverlay").style.display = "none";
        document.getElementById("loginUsername").value = "";
        document.getElementById("loginPassword").value = "";
        if (
          window.currentUserRole !== "worker" &&
          typeof window.requestNotifPermission === "function"
        ) {
          window.requestNotifPermission();
        }

        if (window.currentUserRole === "worker") {
          window.isWorkerMode = true;
          document.body.classList.add("worker-view");
          document.body.classList.remove("sub-manager");
        } else {
          window.isWorkerMode = false;
          document.body.classList.remove("worker-view");
          if (window.currentUserRole === "subManager") {
            document.body.classList.add("sub-manager");
          } else {
            document.body.classList.remove("sub-manager");
          }
        }

        if (typeof window.populateWorkerRequestNames === "function")
          window.populateWorkerRequestNames();

        // הרשמה להתראות שינוי משמרות עבור המשתמש המחובר
        const _notifId =
          (window.loggedInWorker && window.loggedInWorker.id) ||
          (window.loggedInUser && window.loggedInUser.id);
        if (_notifId != null && typeof window.subscribeShiftNotifs === "function")
          window.subscribeShiftNotifs(_notifId);

        // מנהל — איסוף בקשות ממתינות קיימות לאינדקס הגלובלי (פעם אחת בכניסה)
        if (!window.isWorkerMode && typeof window.backfillPendingIndex === "function")
          window.backfillPendingIndex();

        window.showPage("schedule");
        if (typeof window.renderTable === "function")
          window.renderTable(window.currentSchedule, window.currentNotesLog);
      }

      window.loginAs = function (role) {
        document.getElementById("mainLoginBtns").style.display = "none";
        document.getElementById("workerLoginDiv").style.display = "flex";
      };

      window.logoutToSwitch = function () {
        if (window.isEditMode) window.toggleEditMode();
        window.loggedInUser = null;
        window.currentUserRole = null;
        window.isWorkerMode = false;
        window.loggedInWorker = null;
        if (typeof window.clearSession === "function") window.clearSession();
        // ביטול הרשאת כתיבה של המנהל בעת התנתקות — חזרה לאנונימי
        if (typeof window.fbGoAnonymous === "function") window.fbGoAnonymous();
        document.body.classList.remove("worker-view", "sub-manager");
        document.getElementById("loginOverlay").style.display = "flex";
      };

      // זמינות משמרת — האם אסור לשבץ עובד למשמרת זו לפי הגדרות בוקר/ערב/לילה
      window._empCantDoShift = function (emp, shift) {
        if (!emp) return false;
        if (shift === "בוקר") return emp.canMorning === false;
        if (shift === "ערב") return emp.canEvening === false;
        if (shift === "לילה")
          return emp.canNight === false || emp.noNights === true;
        return false;
      };

      window.isAllowedInLoc = function (emp, day, shift, targetLoc) {
        let pref =
          emp.prefs &&
          emp.prefs.find((p) => p.day === day && p.shift === shift);
        if (pref) return pref.loc === targetLoc;
        if (emp.fixedLoc && emp.fixedLoc !== "")
          return emp.fixedLoc === targetLoc;
        return true;
      };

      window.toggleLock = function (day, shift, loc, empId) {
        if (!window.isEditMode) return;
        if (
          window.currentSchedule &&
          window.currentSchedule[`${day}-${shift}`] &&
          window.currentSchedule[`${day}-${shift}`][loc]
        ) {
          let emp = window.currentSchedule[`${day}-${shift}`][loc].find(
            (e) => e.id == empId,
          );
          if (emp) {
            emp.isLocked = !emp.isLocked;
            window.triggerUnsavedChanges();
          }
        }
      };

      window.toggleShiftLock = function (day, shift, loc) {
        if (!window.isEditMode) return;
        if (!window.currentSchedule.shiftLocks) window.currentSchedule.shiftLocks = {};
        const key = `${day}-${shift}-${loc}`;
        window.currentSchedule.shiftLocks[key] = !window.currentSchedule.shiftLocks[key];
        window.triggerUnsavedChanges();
        if (typeof window.renderTable === "function")
          window.renderTable(window.currentSchedule, window.currentNotesLog);
        if (typeof window.renderMobileCards === "function")
          window.renderMobileCards(window.currentSchedule, window.currentNotesLog);
      };

      window.isShiftLocked = function (day, shift, loc) {
        return !!(window.currentSchedule.shiftLocks && window.currentSchedule.shiftLocks[`${day}-${shift}-${loc}`]);
      };

      window.selectMobileDay = function (dayIndex) {
        window.currentMobileDay = dayIndex;
        const daySelect = document.getElementById("mobileDaySelect");
        if (daySelect) daySelect.value = String(dayIndex);
        // רינדור מיידי של הכרטיסיות בנייד לפי היום החדש
        if (typeof window.renderMobileCards === "function")
          window.renderMobileCards(
            window.currentSchedule,
            window.currentNotesLog,
          );
      };

      window.updateShiftCustomName = function (day, shift, loc, val) {
        if (!window.currentSchedule[`${day}-${shift}`])
          window.currentSchedule[`${day}-${shift}`] = {};
        window.currentSchedule[`${day}-${shift}`][loc + "_customName"] = val;
        window.triggerUnsavedChanges();
      };

      window.updateDailyNote = function (day, val) {
        if (!window.currentSchedule.dailyNotes)
          window.currentSchedule.dailyNotes = {};
        window.currentSchedule.dailyNotes[day] = val;
        window.triggerUnsavedChanges();
      };

      window.getLocName = function (loc) {
        if (window.isEmergencyMode && loc === LOC_MATAL) return "200";
        return loc;
      };

      window.initSchedule = function () {
        if (!window.currentSchedule) window.currentSchedule = {};
        if (!window.currentSchedule.special)
          window.currentSchedule.special = {};
        if (!window.currentSchedule.dailyNotes)
          window.currentSchedule.dailyNotes = {};
        if (!window.currentSchedule.shiftLocks)
          window.currentSchedule.shiftLocks = {};
        const _mU = window.currentSchedule.matalUnderstaff === true;
        days.forEach((d) => {
          window.currentShifts.forEach((s) => {
            if (!window.currentSchedule[`${d}-${s}`]) {
              window.currentSchedule[`${d}-${s}`] = {};
            }
            if (!window.currentSchedule[`${d}-${s}`][LOC_MATAL])
              window.currentSchedule[`${d}-${s}`][LOC_MATAL] = [];
            if (!window.currentSchedule[`${d}-${s}`][LOC_ZIRA])
              window.currentSchedule[`${d}-${s}`][LOC_ZIRA] = [];
          });
          // מצב חוסר מת"ל: גם יצירת slot 24 שעות למת"ל
          if (_mU) {
            if (!window.currentSchedule[`${d}-24 שעות`])
              window.currentSchedule[`${d}-24 שעות`] = {};
            if (!window.currentSchedule[`${d}-24 שעות`][LOC_MATAL])
              window.currentSchedule[`${d}-24 שעות`][LOC_MATAL] = [];
          }
        });
      };

      window.toggleDarkMode = function () {
        window.isDarkMode = !window.isDarkMode;
        localStorage.setItem(
          "shift_darkmode_v47",
          JSON.stringify(window.isDarkMode),
        );
        window.updateDarkModeUI();
      };

      window.updateDarkModeUI = function () {
        if (window.isDarkMode) {
          document.body.classList.add("dark-mode");
          document.getElementById("darkModeBtn").innerText = "☀️ מצב בהיר";
        } else {
          document.body.classList.remove("dark-mode");
          document.getElementById("darkModeBtn").innerText = "🌙 מצב כהה";
        }
      };

      window.toggleMatalUnderstaff = function () {
        const current = window.currentSchedule.matalUnderstaff === true;
        if (current) {
          if (!confirm('ביטול מצב חוסר כוח אדם — מת"ל יחזור למשמרת בוקר+לילה. להמשיך?')) return;
          window.currentSchedule.matalUnderstaff = false;
          window.updateMatalUnderstaffUI();
          window.triggerUnsavedChanges();
        } else {
          window.openModeSettings('matal', true);
        }
      };

      window.updateMatalUnderstaffUI = function () {
        const btn = document.getElementById("matalUnderstaffBtn");
        if (!btn) return;
        const active = window.currentSchedule && window.currentSchedule.matalUnderstaff === true;
        if (active) {
          btn.style.background = "#b45309";
          btn.style.color = "white";
          btn.innerText = '⚠️ מת"ל 24ש: פעיל';
        } else {
          btn.style.background = "transparent";
          btn.style.color = "#b45309";
          btn.innerText = '⚠️ מת"ל 24ש (חוסר)';
        }
      };

      window._activateEmergency = function (startDate, endDate) {
        window.isEmergencyMode = true;
        window.currentShifts = emergencyShifts;
        window.currentSchedule.isEmergencyMode = true;
        window.currentSchedule.emergencyStartDate = startDate || null;
        window.currentSchedule.emergencyEndDate = endDate || null;
        window.initSchedule();
        window.updateEmergencyUI();
        window.renderRulesUI();
        window.triggerUnsavedChanges();
      };

      window.toggleEmergency = function () {
        if (window.isEmergencyMode) {
          if (!confirm("ביטול מצב חירום. להמשיך?")) return;
          window.isEmergencyMode = false;
          window.currentShifts = normalShifts;
          window.currentSchedule.isEmergencyMode = false;
          window.initSchedule();
          window.updateEmergencyUI();
          window.renderRulesUI();
          window.triggerUnsavedChanges();
        } else {
          window.openModeSettings('emergency', true);
        }
      };

      window.updateEmergencyUI = function () {
        const btn = document.getElementById("globalEmergencyBtn");
        const fBtn = document.getElementById("filterBtnMATAL");
        const fillBtn = document.getElementById("fillShortagesBtn");
        const navWorkerReq = document.getElementById("nav-worker-requests");
        if (window.isEmergencyMode) {
          document.body.classList.add("emergency-active");
          btn.innerText = "🚨 חירום: פעיל";
          btn.classList.add("btn-contained");
          if (fBtn) fBtn.innerText = "200";
          document
            .getElementById("nav-requests")
            .classList.add("emergency-hidden");
          if (navWorkerReq) navWorkerReq.classList.add("emergency-hidden");
          if (
            document
              .getElementById("page-requests")
              .classList.contains("active") ||
            (navWorkerReq &&
              document
                .getElementById("page-worker-requests")
                .classList.contains("active"))
          ) {
            window.showPage("schedule");
          }
          document.getElementById("rulesModeSelect").value = "emergency";
          if (fillBtn) fillBtn.classList.add("emergency-hidden");
        } else {
          document.body.classList.remove("emergency-active");
          btn.innerText = "🚨 חירום: כבוי";
          btn.classList.remove("btn-contained");
          btn.style.borderColor = "white";
          btn.style.color = "white";
          if (fBtn) fBtn.innerText = 'מת"ל';
          document
            .getElementById("nav-requests")
            .classList.remove("emergency-hidden");
          if (navWorkerReq) navWorkerReq.classList.remove("emergency-hidden");
          document.getElementById("rulesModeSelect").value = "normal";
          if (fillBtn) fillBtn.classList.remove("emergency-hidden");
        }
      };

      window.clearScheduleWithPrompt = function () {
        if (confirm("בטוח שברצונך למחוק את כל הלוח ולהתחיל מאפס?")) {
          let pub = window.currentSchedule.isPublished;
          window.currentSchedule = {
            isPublished: pub,
            special: {},
            dailyNotes: {},
          };
          window.currentNotesLog = {};
          window.initSchedule();
          window.triggerUnsavedChanges();
        }
      };

      // מחזיר רשימת סטטוסים מיוחדים ליום נתון (לגסי + גלובלי + משימות)
      window.getSpecialsForDay = function (dayName, data) {
        const legacy = (data && data.special && data.special[dayName]) ? data.special[dayName] : [];
        const weekSun = window.getSunday(window.currentWeekOffset || 0);
        const dayIdx = days.indexOf(dayName);
        const cellDate = new Date(weekSun);
        cellDate.setDate(cellDate.getDate() + dayIdx);
        const cellKey = `${cellDate.getFullYear()}-${String(cellDate.getMonth()+1).padStart(2,"0")}-${String(cellDate.getDate()).padStart(2,"0")}`;
        const globalSpecs = (window.specialStatuses || [])
          .filter((s) => s.startDate <= cellKey && cellKey <= s.endDate)
          .map((s) => ({ id: s.empId, name: s.empName, status: s.status, text: s.text || "", _specialId: s.id }));
        const taskSpecs = [];
        (window.systemTasks || [])
          .filter((t) => !t.completed && t.date <= cellKey && (t.endDate || t.date) >= cellKey)
          .forEach((t) => {
            const assignees = t.assignees || (t.assignee ? [{ name: t.assignee }] : []);
            assignees.forEach((a) => {
              const emp = (window.staff || []).find((e) => e.name === a.name || e.id === a.id);
              if (emp && !taskSpecs.find((x) => x.id === emp.id))
                taskSpecs.push({ id: emp.id, name: emp.name, status: t.category || "משימה", text: t.desc || "", _taskId: t.id });
            });
          });
        const merged = [...legacy];
        [...globalSpecs, ...taskSpecs].forEach((s) => {
          if (!merged.find((m) => m.id == s.id)) merged.push(s);
        });
        return merged;
      };

      // תווית תצוגה לסטטוס מיוחד — כשהסטטוס הוא "אחר", מציג את ההערה שנכתבה
      window.specStatusLabel = function (sp) {
        if (!sp) return "";
        return sp.status === "אחר" ? (sp.text || "מיוחדת") : sp.status;
      };

      window.exportToExcel = function () {
        let csvContent = "\uFEFF";
        csvContent +=
          "שם,ראשון,איפה,שני,איפה,שלישי,איפה,רביעי,איפה,חמישי,איפה,שישי,איפה,שבת,איפה\n";
        let activeStaff = window.staff
          .filter((e) => e.isActive !== false)
          .sort(
            (a, b) =>
              window.roleTypes.indexOf(a.type) -
              window.roleTypes.indexOf(b.type),
          );
        const _weekSunExcel = window.getSunday(window.currentWeekOffset || 0);
        activeStaff.forEach((emp) => {
          let row = [emp.name];
          days.forEach((d, dIdx) => {
            let shiftVal = "מנוחה";
            let locVal = "-";
            // חישוב תאריך ליום זה
            const _cellDateExcel = new Date(_weekSunExcel);
            _cellDateExcel.setDate(_cellDateExcel.getDate() + dIdx);
            const _cellKeyExcel = `${_cellDateExcel.getFullYear()}-${String(_cellDateExcel.getMonth()+1).padStart(2,"0")}-${String(_cellDateExcel.getDate()).padStart(2,"0")}`;
            // בדיקת סטטוס מיוחד — גם לגסי וגם גלובלי
            const allSpecials = window.getSpecialsForDay ? window.getSpecialsForDay(d, window.currentSchedule) : [];
            const special = allSpecials.find((e) => e.id === emp.id || e.id == emp.id);
            if (special) {
              if (special.status === "אחר") {
                // סטטוס "אחר": בעמודת היום נכתב "אחר", ובעמודת "איפה" ההערה שנכתבה
                shiftVal = "אחר";
                locVal = special.text || "";
              } else {
                shiftVal = special.status;
                locVal = "-";
              }
            }
            if (shiftVal === "מנוחה") {
              // בדיקה בשמרות הנוכחיות (כולל 24ש)
              const shiftsToCheck = [...window.currentShifts];
              // במצב חוסר מת"ל — גם 24ש נכנס לבדיקה
              if (window.currentSchedule && window.currentSchedule.matalUnderstaff === true && !window.isEmergencyMode && !shiftsToCheck.includes("24 שעות"))
                shiftsToCheck.push("24 שעות");
              shiftsToCheck.forEach((s) => {
                baseLocs.forEach((loc) => {
                  if (
                    window.currentSchedule[`${d}-${s}`] &&
                    window.currentSchedule[`${d}-${s}`][loc]
                  ) {
                    let found = window.currentSchedule[`${d}-${s}`][loc].find(
                      (e) => e.id === emp.id,
                    );
                    if (found) {
                      shiftVal = s;
                      if (found.note) shiftVal += ` (${found.note})`;
                      locVal = loc;
                    }
                  }
                });
              });
            }
            if (shiftVal === "מנוחה") {
              if (window.currentNotesLog && window.currentNotesLog[d]) {
                let note = window.currentNotesLog[d].find(
                  (n) => n.emp.id === emp.id,
                );
                if (note) {
                  shiftVal = note.reason;
                }
              }
            }
            row.push(shiftVal, locVal);
          });
          // עיטוף שדות עם פסיק/מרכאות/שורה חדשה כדי לא לשבור עמודות (הערות חופשיות)
          const escapeCsv = (v) => {
            const s = String(v == null ? "" : v);
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          };
          csvContent += row.map(escapeCsv).join(",") + "\n";
        });
        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        link.setAttribute("href", URL.createObjectURL(blob));
        link.setAttribute("download", "סידור_עבודה.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      window.openSpecialStatusModal = function () {
        let options = window.staff
          .filter((e) => e.isActive !== false)
          .map((e) => `<option value="${e.id}">${e.name}</option>`)
          .join("");
        document.getElementById("specEmpSelector").innerHTML =
          `<option value="">-- בחר עובד --</option>` + options;
        // תמיד איפוס תאריכים + checkbox'ים בכל פתיחה
        const today = new Date().toISOString().split("T")[0];
        const sd = document.getElementById("specStartDate");
        const ed = document.getElementById("specEndDate");
        if (sd) sd.value = today;
        if (ed) ed.value = today;
        const cbSingle = document.getElementById("specSingleDay");
        const cbMulti = document.getElementById("specMultiParticipant");
        if (cbSingle) { cbSingle.checked = false; window.toggleSpecDayMode && window.toggleSpecDayMode(); }
        if (cbMulti) { cbMulti.checked = false; window.toggleSpecParticipantMode && window.toggleSpecParticipantMode(); }
        document.getElementById("specNote").value = "";
        document.getElementById("specialStatusModal").style.display = "flex";
      };

      // פונקציית עזר: הסרת עובד מכל משמרות יום נתון (לפי שם יום)
      window._removeEmpFromDayShifts = function(dayName, empId) {
        const allShiftsDay = [...window.currentShifts];
        if (window.currentSchedule.matalUnderstaff || window.isEmergencyMode)
          allShiftsDay.push("24 שעות");
        allShiftsDay.forEach((s) => {
          baseLocs.forEach((l) => {
            if (window.currentSchedule[`${dayName}-${s}`] && window.currentSchedule[`${dayName}-${s}`][l]) {
              window.currentSchedule[`${dayName}-${s}`][l] = window.currentSchedule[`${dayName}-${s}`][l].filter((x) => x.id != empId);
            }
          });
        });
      };

      window.saveSpecialStatus = function () {
        const isSingleDay = document.getElementById("specSingleDay")?.checked;
        const isMulti = document.getElementById("specMultiParticipant")?.checked;
        let startDate = document.getElementById("specStartDate").value;
        let endDate = isSingleDay ? startDate : (document.getElementById("specEndDate").value || startDate);
        let status = document.getElementById("specType").value;
        let text = document.getElementById("specNote").value;
        if (!startDate) return;
        // שמירה: status נשאר "אחר" (לא נדרס) כדי שהייצוא יבחין בו; ההערה נשמרת ב-text
        if (endDate < startDate) endDate = startDate;

        // בנה רשימת עובדים (יחיד או מרובה)
        let emps = [];
        if (isMulti) {
          document.querySelectorAll(".spec-participant-select").forEach((sel) => {
            if (sel.value) {
              const e = window.staff.find((x) => x.id == sel.value);
              if (e) emps.push(e);
            }
          });
          if (emps.length === 0) { alert("יש לבחור לפחות עובד אחד!"); return; }
        } else {
          const empId = document.getElementById("specEmpSelector").value;
          if (!empId) return;
          const e = window.staff.find((x) => x.id == empId);
          if (!e) return;
          emps = [e];
        }

        emps.forEach((emp) => {
          // הסרת סטטוסים קיימים לאותו עובד שחופפים את הטווח
          window.specialStatuses = (window.specialStatuses || []).filter(
            (s) => !(s.empId == emp.id && s.startDate <= endDate && s.endDate >= startDate && !s.taskId)
          );
          window.specialStatuses.push({ id: Date.now() + Math.floor(Math.random()*1000), empId: emp.id, empName: emp.name, status, text, startDate, endDate });

          // הסרה ממשמרות השבוע הנוכחי עבור ימים שנכנסים בטווח
          const weekSun = window.getSunday(window.currentWeekOffset || 0);
          days.forEach((dayName, idx) => {
            const cellDate = new Date(weekSun);
            cellDate.setDate(cellDate.getDate() + idx);
            const cellKey = cellDate.toISOString().split("T")[0];
            if (cellKey >= startDate && cellKey <= endDate)
              window._removeEmpFromDayShifts(dayName, emp.id);
          });
        });

        window.saveToCloud("specialStatuses", window.specialStatuses);
        document.getElementById("specialStatusModal").style.display = "none";
        window.triggerUnsavedChanges();
      };

      window.removeSpecialStatus = function (specialId) {
        if (!confirm("להסיר את הסטטוס המיוחד?")) return;
        window.specialStatuses = (window.specialStatuses || []).filter((s) => s.id !== specialId);
        window.saveToCloud("specialStatuses", window.specialStatuses);
      };

      window.removeLegacySpecial = function (day, empId) {
        if (!confirm("להסיר את הסטטוס המיוחד?")) return;
        if (window.currentSchedule.special && window.currentSchedule.special[day])
          window.currentSchedule.special[day] = window.currentSchedule.special[day].filter((e) => e.id != empId);
        window.triggerUnsavedChanges();
      };

      window.renderStaffPool = function () {
        let activeStaff = [...window.staff].filter((e) => e.isActive !== false);
        activeStaff.sort(
          (a, b) =>
            window.roleTypes.indexOf(a.type) - window.roleTypes.indexOf(b.type),
        );
        let pool = document.getElementById("staffPool");
        if (pool) {
          pool.innerHTML = activeStaff
            .map(
              (e) =>
                `<div class="name-chip chip-${(e.type || "").replace(/\s+/g, "-")}" draggable="true" ondragstart="window.dragStart(event, ${e.id}, 'pool', '', '')" style="cursor:grab; display:flex; justify-content:center; width:calc(100% - 10px); margin:5px auto;">${e.name} (${e.type})</div>`,
            )
            .join("");
        }
      };

      window.toggleEditMode = function () {
        window.isEditMode = !window.isEditMode;
        const sidebar = document.getElementById("staffSidebar");
        const btn = document.getElementById("editModeBtn");
        const toggleLbl = document.getElementById("autoFillToggleLbl");
        if (window.isEditMode) {
          btn.innerText = "סיים עריכה";
          btn.classList.replace("btn-outlined", "btn-error");
          if (toggleLbl) toggleLbl.style.display = "inline-block";
          if (sidebar) sidebar.style.display = "block";
          window.renderStaffPool();
        } else {
          btn.innerText = "עריכה ידנית: כבוי";
          btn.classList.replace("btn-error", "btn-outlined");
          if (toggleLbl) toggleLbl.style.display = "none";
          if (sidebar) sidebar.style.display = "none";
        }
        window.renderTable(window.currentSchedule, window.currentNotesLog);
      };

      window.toggleVisibility = function (id) {
        let input = document.getElementById(id);
        if (input) {
          input.type = input.type === "password" ? "text" : "password";
        }
      };

      window.renderStaff = function () {
        if (typeof window.renderRoleFilters === "function")
          window.renderRoleFilters();
        if (typeof window.populateEmpFilterDropdown === "function")
          window.populateEmpFilterDropdown();

        let grid = document.getElementById("staffGrid");
        if (grid && window.staff) {
          grid.innerHTML = window.staff
            .map((e) => {
              const isInactive = e.isActive === false ? "emp-inactive" : "";
              let displayFixed = window.getLocName
                ? window.getLocName(e.fixedLoc)
                : e.fixedLoc || "רנדומלי";

              let empConst = e.constraints || [];
              let uniqueDaysOff = new Set(
                empConst
                  .filter((c) => {
                    let d = c.split("-")[0];
                    return (
                      empConst.includes(`${d}-בוקר`) &&
                      empConst.includes(`${d}-ערב`) &&
                      empConst.includes(`${d}-לילה`)
                    );
                  })
                  .map((c) => c.split("-")[0]),
              ).size;
              let hasPartial = empConst.length > uniqueDaysOff * 3;
              const _vacQuota = e.vacationQuota !== undefined ? e.vacationQuota : 14;
              // גם ימים מסטטוס מיוחד מסוג חופש
              let _specVacDays = 0;
              (window.specialStatuses || []).filter(s => String(s.empId) === String(e.id) && ["חופש","חופשה","מחלה"].some(v => (s.status||"").includes(v))).forEach(s => {
                if (s.startDate && s.endDate) {
                  _specVacDays += Math.ceil((new Date(s.endDate) - new Date(s.startDate)) / 86400000) + 1;
                }
              });
              const _vacUsed = uniqueDaysOff + _specVacDays;
              const _vacRemaining = _vacQuota - _vacUsed;

              let roleName =
                e.systemRole === "superAdmin"
                  ? "מנהל ראשי"
                  : e.systemRole === "subManager"
                    ? "מנהל משני"
                    : "עובד";
              let pId = e.personalId || "לא הוגדר";
              let pass = e.password || "1234";

              return `<div class="emp-card chip-${(e.type || "").replace(/\s+/g, "-")} ${isInactive}" onclick="window.openModal(${e.id})">
                        <div style="width:100%;">
                            <div style="font-size:1.1em; font-weight:bold; color:var(--md-primary); margin-bottom:8px; border-bottom:1px solid var(--md-divider); padding-bottom:5px;">
                                ${e.name} ${(() => { const off = []; if (e.canMorning === false) off.push("בוקר"); if (e.canEvening === false) off.push("ערב"); if (e.canNight === false || e.noNights) off.push("לילה"); return off.length ? `<span style="font-size:0.65em; color:var(--md-error); font-weight:normal;">⛔${off.join("/")}</span>` : ""; })()} ${e.workedLastWeekend ? "💤" : ""} ${e.isNextWeekend ? "🗓️" : ""}
                            </div>
                            <div style="font-size:0.85em; color:var(--text-muted); display:grid; grid-template-columns: 1fr 1fr; gap:4px;">
                                <span>דרג: <b>${e.type}</b></span>
                                <span>שיוך: <b>${displayFixed}</b></span>
                                <span style="grid-column:1/-1; color:${_vacRemaining < 0 ? 'var(--md-error)' : 'var(--text-muted)'};">חופשים: <b>${_vacUsed} / ${_vacQuota}</b> (נשארו: <b style="color:${_vacRemaining < 0 ? 'var(--md-error)' : 'var(--md-success)'}">${_vacRemaining}</b>)</span>
                            </div>
                            <div class="super-only" style="background:#f1f5f9; padding:8px; border-radius:6px; margin-top:10px; font-size:0.85em;">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span>מ.אישי: <b>${pId}</b></span>
                                    <span style="display:flex; align-items:center; gap:5px;">סיסמה: <b id="staff_pass_${e.id}" style="letter-spacing: 2px;">****</b> 
                                        <span style="cursor:pointer; font-size:1.1em;" title="הצג/הסתר" onclick="let el=document.getElementById('staff_pass_${e.id}'); el.innerText = el.innerText === '****' ? '${pass}' : '****'; el.style.letterSpacing = el.innerText === '****' ? '2px' : '0px'; event.stopPropagation();">👁️</span>
                                    </span>
                                </div>
                                <div style="margin-top:4px; color:#c2410c;">הרשאה: <b>${roleName}</b></div>
                            </div>
                        </div>
                    </div>`;
            })
            .join("");
        }
        if (
          typeof window.populateWorkerRequestNames === "function" &&
          window.currentUserRole === "worker"
        )
          window.populateWorkerRequestNames();
      };

      window.dragStart = function (
        ev,
        empId,
        sourceDay,
        sourceShift,
        sourceLoc,
      ) {
        if (!window.isEditMode) {
          ev.preventDefault();
          return;
        }
        window.draggedData = { empId, sourceDay, sourceShift, sourceLoc };
        ev.dataTransfer.setData("text/plain", empId);
      };

      window.allowDrop = function (ev) {
        if (!window.isEditMode) return;
        ev.preventDefault();
        ev.currentTarget.classList.add("drag-over");
      };

      window.dragLeave = function (ev) {
        ev.currentTarget.classList.remove("drag-over");
      };

      window.drop = function (ev, targetDay, targetShift, targetLoc) {
        if (!window.isEditMode) return;
        ev.preventDefault();
        ev.currentTarget.classList.remove("drag-over");
        if (!window.draggedData) return;
        const { empId, sourceDay, sourceShift, sourceLoc } = window.draggedData;
        const emp = window.staff.find((e) => e.id == empId);

        if (sourceDay !== "pool") {
          let isSourceBlock = false;
          let sourceBlockArr = [];
          if (
            sourceLoc === LOC_MATAL &&
            weekendShiftsMATAL.includes(`${sourceDay}-${sourceShift}`)
          ) {
            isSourceBlock = true;
            sourceBlockArr = weekendShiftsMATAL;
          } else if (
            sourceLoc === LOC_ZIRA &&
            weekendShiftsZira.includes(`${sourceDay}-${sourceShift}`)
          ) {
            isSourceBlock = true;
            sourceBlockArr = weekendShiftsZira;
          }
          if (isSourceBlock) {
            sourceBlockArr.forEach((sk) => {
              let [bDay, bShift] = sk.split("-");
              if (
                window.currentSchedule[`${bDay}-${bShift}`] &&
                window.currentSchedule[`${bDay}-${bShift}`][sourceLoc]
              ) {
                window.currentSchedule[`${bDay}-${bShift}`][sourceLoc] =
                  window.currentSchedule[`${bDay}-${bShift}`][sourceLoc].filter(
                    (e) => e.id != empId,
                  );
              }
            });
          } else {
            if (
              window.currentSchedule[`${sourceDay}-${sourceShift}`] &&
              window.currentSchedule[`${sourceDay}-${sourceShift}`][sourceLoc]
            ) {
              window.currentSchedule[`${sourceDay}-${sourceShift}`][sourceLoc] =
                window.currentSchedule[`${sourceDay}-${sourceShift}`][
                  sourceLoc
                ].filter((x) => x.id != empId);
            }
          }
        }

        window.currentShifts.forEach((s) => {
          baseLocs.forEach((l) => {
            if (
              window.currentSchedule[`${targetDay}-${s}`] &&
              window.currentSchedule[`${targetDay}-${s}`][l]
            ) {
              window.currentSchedule[`${targetDay}-${s}`][l] =
                window.currentSchedule[`${targetDay}-${s}`][l].filter(
                  (x) => x.id != empId,
                );
            }
          });
        });
        // גם הסרה מ-24 שעות מת"ל אם במצב חוסר
        if (window.currentSchedule.matalUnderstaff === true &&
            window.currentSchedule[`${targetDay}-24 שעות`] &&
            window.currentSchedule[`${targetDay}-24 שעות`][LOC_MATAL]) {
          window.currentSchedule[`${targetDay}-24 שעות`][LOC_MATAL] =
            window.currentSchedule[`${targetDay}-24 שעות`][LOC_MATAL].filter(x => x.id != empId);
        }
        if (
          window.currentSchedule.special &&
          window.currentSchedule.special[targetDay]
        )
          window.currentSchedule.special[targetDay] =
            window.currentSchedule.special[targetDay].filter(
              (x) => x.id != empId,
            );

        let isTargetBlock = false;
        let targetBlockArr = [];
        if (
          targetLoc === LOC_MATAL &&
          weekendShiftsMATAL.includes(`${targetDay}-${targetShift}`)
        ) {
          isTargetBlock = true;
          targetBlockArr = weekendShiftsMATAL;
        } else if (
          targetLoc === LOC_ZIRA &&
          weekendShiftsZira.includes(`${targetDay}-${targetShift}`)
        ) {
          isTargetBlock = true;
          targetBlockArr = weekendShiftsZira;
        }

        if (isTargetBlock) {
          targetBlockArr.forEach((sk) => {
            let [bDay, bShift] = sk.split("-");
            window.currentShifts.forEach((s) => {
              baseLocs.forEach((l) => {
                if (
                  window.currentSchedule[`${bDay}-${s}`] &&
                  window.currentSchedule[`${bDay}-${s}`][l]
                )
                  window.currentSchedule[`${bDay}-${s}`][l] =
                    window.currentSchedule[`${bDay}-${s}`][l].filter(
                      (x) => x.id != empId,
                    );
              });
            });
            if (
              window.currentSchedule.special &&
              window.currentSchedule.special[bDay]
            )
              window.currentSchedule.special[bDay] =
                window.currentSchedule.special[bDay].filter(
                  (x) => x.id != empId,
                );

            // גרירה ידנית נועלת אוטומטית (isLocked: true)
            if (
              window.currentSchedule[`${bDay}-${bShift}`] &&
              window.currentSchedule[`${bDay}-${bShift}`][targetLoc] &&
              !window.currentSchedule[`${bDay}-${bShift}`][targetLoc].find(
                (x) => x.id == empId,
              )
            ) {
              window.currentSchedule[`${bDay}-${bShift}`][targetLoc].push({
                ...emp,
                isLocked: true,
              });
            }
          });
        } else {
          // גרירה ידנית נועלת אוטומטית
          window.currentSchedule[`${targetDay}-${targetShift}`][targetLoc].push(
            { ...emp, isLocked: true },
          );
        }

        if (sourceDay !== "pool") {
          const autoToggle = document.getElementById("autoFillToggle");
          if (autoToggle && autoToggle.checked) {
            if (!window.isEmergencyMode) {
              let rKey =
                window.isOffDay && window.isOffDay(sourceDay)
                  ? "weekend"
                  : `weekday_${sourceShift}`;
              if (window.rules[sourceLoc] && window.rules[sourceLoc][rKey]) {
                const sRule = window.rules[sourceLoc][rKey];
                if (
                  window.currentSchedule[`${sourceDay}-${sourceShift}`][
                    sourceLoc
                  ].length < sRule.count
                ) {
                  window.autoFillShortage(
                    sourceDay,
                    sourceShift,
                    sourceLoc,
                    sRule,
                  );
                }
              }
            } else {
              window.autoFillEmergency(sourceDay, sourceShift, sourceLoc);
            }
          }
        }
        window.draggedData = null;
        window.recomputeNotesFromSchedule();
        window.triggerUnsavedChanges();
      };

      window.recomputeNotesFromSchedule = function () {
        let activeStaff = window.staff.filter((e) => e.isActive !== false);
        days.slice(0, 5).forEach((day, dIdx) => {
          let resting = [];
          activeStaff.forEach((emp) => {
            let empConst = emp.constraints || [];
            // אחרי לילה — בדיקה לפי היום הקודם בלוח הנוכחי
            if (dIdx > 0) {
              let prevDay = days[dIdx - 1];
              let prevNightKey = `${prevDay}-לילה`;
              let workedPrevNight =
                window.currentSchedule[prevNightKey] &&
                ((window.currentSchedule[prevNightKey][LOC_MATAL] || []).find(
                  (e) => e.id === emp.id,
                ) ||
                  (window.currentSchedule[prevNightKey][LOC_ZIRA] || []).find(
                    (e) => e.id === emp.id,
                  ));
              if (workedPrevNight) {
                resting.push({ emp, reason: "אחרי לילה", icon: "🌙" });
                return;
              }
              // אחרי 24ש — חירום או חוסר מת"ל
              const prev24Key = `${prevDay}-24 שעות`;
              let workedPrev24 = (window.isEmergencyMode || (window.currentSchedule && window.currentSchedule.matalUnderstaff === true)) &&
                window.currentSchedule[prev24Key] &&
                (
                  (window.currentSchedule[prev24Key][LOC_MATAL] || []).find((e) => e.id === emp.id) ||
                  (window.currentSchedule[prev24Key][LOC_ZIRA] || []).find((e) => e.id === emp.id)
                );
              if (workedPrev24) {
                resting.push({ emp, reason: "אחרי 24ש", icon: "😴" });
                return;
              }
            }
            // אחרי שבת
            if (
              day === "ראשון" &&
              emp.workedLastWeekend &&
              emp.type !== "נחפף"
            ) {
              resting.push({ emp, reason: "אחרי שבת", icon: "💤" });
              return;
            }
            // חופשות ואילוצים
            let isFullOff =
              empConst.includes(`${day}-בוקר`) &&
              empConst.includes(`${day}-ערב`) &&
              empConst.includes(`${day}-לילה`);
            if (isFullOff)
              resting.push({ emp, reason: "יום חופש מלא", icon: "🌴" });
          });
          window.currentNotesLog[day] = resting;
        });
        if (typeof window.renderTable === "function")
          window.renderTable(window.currentSchedule, window.currentNotesLog);
      };

      window.autoFillShortage = function (day, shift, loc, rule, excludeId = null) {
        if (window.isShiftLocked(day, shift, loc)) return;
        let activeStaff = window.staff.filter((e) => e.isActive !== false && (excludeId === null || e.id != excludeId));
        let dayIdx = days.indexOf(day);
        let prevDay = dayIdx > 0 ? days[dayIdx - 1] : null;
        let nextDay = dayIdx < 6 ? days[dayIdx + 1] : null;
        let schedArr = window.currentSchedule[`${day}-${shift}`][loc] || [];
        let targetLimit = rule.count;
        if (shift === "לילה") {
          let hasCapableManager = schedArr.some(
            (x) =>
              x.type === "קבינט בכיר" ||
              x.type === "מילואים" ||
              (x.type === "קבע" && x.canManNightAlone),
          );
          if (hasCapableManager)
            targetLimit = Math.max(1, schedArr.filter((e) => e.isPref).length);
        }
        if (schedArr.length >= targetLimit) return;

        let available = activeStaff.filter((e) => {
          if (!rule.roles.includes(e.type)) return false;
          let alreadyInShift = false;
          if (
            window.currentSchedule.special &&
            window.currentSchedule.special[day] &&
            window.currentSchedule.special[day].some((x) => x.id === e.id)
          )
            return false;
          const _shiftsToCheck = window.currentSchedule.matalUnderstaff === true
            ? [...window.currentShifts, "24 שעות"] : window.currentShifts;
          _shiftsToCheck.forEach((s) => {
            baseLocs.forEach((l) => {
              if (
                window.currentSchedule[`${day}-${s}`] &&
                window.currentSchedule[`${day}-${s}`][l] &&
                window.currentSchedule[`${day}-${s}`][l].find(
                  (x) => x.id === e.id,
                )
              ) {
                alreadyInShift = true;
              }
            });
          });
          if (alreadyInShift) return false;

          if (prevDay) {
            let workedPrevNight = false;
            baseLocs.forEach((l) => {
              if (
                window.currentSchedule[`${prevDay}-לילה`] &&
                window.currentSchedule[`${prevDay}-לילה`][l].find(
                  (x) => x.id === e.id,
                )
              )
                workedPrevNight = true;
              // אחרי 24ש — חירום או חוסר מת"ל
              if (
                (window.isEmergencyMode || window.currentSchedule.matalUnderstaff === true) &&
                window.currentSchedule[`${prevDay}-24 שעות`] &&
                window.currentSchedule[`${prevDay}-24 שעות`][l] &&
                window.currentSchedule[`${prevDay}-24 שעות`][l].find(
                  (x) => x.id === e.id,
                )
              )
                workedPrevNight = true;
            });
            if (workedPrevNight) return false;
          }
          if (shift === "לילה" && nextDay) {
            let worksTomorrowMorning = false;
            baseLocs.forEach((l) => {
              if (
                window.currentSchedule[`${nextDay}-בוקר`] &&
                window.currentSchedule[`${nextDay}-בוקר`][l].find(
                  (x) => x.id === e.id,
                )
              )
                worksTomorrowMorning = true;
            });
            if (worksTomorrowMorning) return false;
          }
          if (day === "ראשון" && e.workedLastWeekend) return false;

          let empConst = e.constraints || [];
          if (empConst.includes(`${day}-${shift}`)) return false;
          if (e.type === "קבינט בכיר" && shift !== "בוקר") return false;
          if (window._empCantDoShift(e, shift)) return false; // זמינות בוקר/ערב/לילה
          if (e.type === "טכנאי" && shift === "ערב" && loc === LOC_ZIRA && !e.canZiraEvening) return false;
          if (
            shift === "לילה" &&
            e.nightsThisWeek >= 2 &&
            !(
              e.prefs &&
              e.prefs.find((p) => p.day === day && p.shift === "לילה")
            )
          )
            return false;
          return true;
        });
        if (available.length > 0) {
          available.sort((a, b) => {
            return a.shiftCount - b.shiftCount || Math.random() - 0.5;
          });
          let chosen = available[0];
          window.currentSchedule[`${day}-${shift}`][loc].push({
            ...chosen,
            isPref: true,
          });
          chosen.shiftCount++;
        }
      };

      window.autoFillEmergency = function (day, shift, loc, excludeId = null) {
        if (window.isShiftLocked(day, shift, loc)) return;
        let activeStaff = window.staff.filter((e) => e.isActive !== false && (excludeId === null || e.id != excludeId));
        let dayIdx = days.indexOf(day);
        let prevDay = dayIdx > 0 ? days[dayIdx - 1] : null;
        let available = activeStaff.filter((e) => {
          let alreadyInShift = false;
          if (
            window.currentSchedule.special &&
            window.currentSchedule.special[day] &&
            window.currentSchedule.special[day].some((x) => x.id === e.id)
          )
            return false;
          window.currentShifts.forEach((s) => {
            baseLocs.forEach((l) => {
              if (
                window.currentSchedule[`${day}-${s}`][l] &&
                window.currentSchedule[`${day}-${s}`][l].find(
                  (x) => x.id === e.id,
                )
              )
                alreadyInShift = true;
            });
          });
          if (alreadyInShift) return false;
          if (prevDay) {
            let workedPrevNight = false;
            baseLocs.forEach((l) => {
              if (
                window.currentSchedule[`${prevDay}-לילה`] &&
                window.currentSchedule[`${prevDay}-לילה`][l].find(
                  (x) => x.id === e.id,
                )
              )
                workedPrevNight = true;
              // אחרי 24ש — חירום או חוסר מת"ל
              if (
                (window.isEmergencyMode || window.currentSchedule.matalUnderstaff === true) &&
                window.currentSchedule[`${prevDay}-24 שעות`] &&
                window.currentSchedule[`${prevDay}-24 שעות`][l] &&
                window.currentSchedule[`${prevDay}-24 שעות`][l].find(
                  (x) => x.id === e.id,
                )
              )
                workedPrevNight = true;
            });
            if (workedPrevNight) return false;
          }
          if (day === "ראשון" && e.workedLastWeekend) return false;
          let empConst = e.constraints || [];
          if (empConst.includes(`${day}-${shift}`)) return false;
          if (e.type === "קבינט בכיר" && loc === LOC_ZIRA) return false;
          return true;
        });
        if (available.length > 0) {
          available.sort((a, b) => {
            return a.shiftCount - b.shiftCount || Math.random() - 0.5;
          });
          let chosen = available[0];
          window.currentSchedule[`${day}-${shift}`][loc].push({
            ...chosen,
            isPref: true,
          });
          chosen.shiftCount++;
        }
      };

      window.removeEmp = function (d, s, loc, id) {
        if (!window.isEditMode) return;
        let isBlockDrop = false;
        let blockArr = [];
        if (loc === LOC_MATAL && weekendShiftsMATAL.includes(`${d}-${s}`)) {
          isBlockDrop = true;
          blockArr = weekendShiftsMATAL;
        } else if (
          loc === LOC_ZIRA &&
          weekendShiftsZira.includes(`${d}-${s}`)
        ) {
          isBlockDrop = true;
          blockArr = weekendShiftsZira;
        }

        if (isBlockDrop) {
          blockArr.forEach((sk) => {
            let [bDay, bShift] = sk.split("-");
            if (
              window.currentSchedule[`${bDay}-${bShift}`] &&
              window.currentSchedule[`${bDay}-${bShift}`][loc]
            ) {
              window.currentSchedule[`${bDay}-${bShift}`][loc] =
                window.currentSchedule[`${bDay}-${bShift}`][loc].filter(
                  (e) => e.id != id,
                );
            }
          });
        } else {
          window.currentSchedule[`${d}-${s}`][loc] = window.currentSchedule[
            `${d}-${s}`
          ][loc].filter((e) => e.id != id);
        }

        const autoToggle = document.getElementById("autoFillToggle");
        if (autoToggle && autoToggle.checked && !window.isShiftLocked(d, s, loc)) {
          if (!window.isEmergencyMode) {
            let rKey = window.isOffDay(d) ? "weekend" : `weekday_${s}`;
            if (window.rules[loc] && window.rules[loc][rKey]) {
              const sRule = window.rules[loc][rKey];
              if (
                window.currentSchedule[`${d}-${s}`][loc].length < sRule.count
              ) {
                // id מועבר כדי לא להחזיר את אותו עובד שהוצא זה עתה
                window.autoFillShortage(d, s, loc, sRule, id);
              }
            }
          } else {
            window.autoFillEmergency(d, s, loc, id);
          }
        }
        window.recomputeNotesFromSchedule();
        window.triggerUnsavedChanges();
      };

      window.toggleMobileMenu = function () {
        const nav = document.getElementById("navContainer");
        if (nav) nav.classList.toggle("active");
      };

      window.closeMobileMenu = function () {
        const nav = document.getElementById("navContainer");
        if (nav) nav.classList.remove("active");
      };

      window.showPage = function (p) {
        if (typeof window.closeMobileMenu === "function")
          window.closeMobileMenu();
        document
          .querySelectorAll(".container")
          .forEach((c) => c.classList.remove("active"));
        document
          .querySelectorAll("nav div")
          .forEach((n) => n.classList.remove("active"));
        if (p === "schedule") {
          let page = document.getElementById("page-schedule");
          if (page) page.classList.add("active");
          let sb = document.getElementById("staffSidebar");
          if (window.isEditMode && sb) sb.classList.add("active");
        } else {
          let sb = document.getElementById("staffSidebar");
          if (sb) sb.classList.remove("active");
          let page = document.getElementById("page-" + p);
          if (page) page.classList.add("active");
        }
        let navBtn = document.getElementById("nav-" + p);
        if (navBtn) navBtn.classList.add("active");

        // עדכון ניווט תחתון
        document.querySelectorAll(".bottom-nav-item").forEach(b => b.classList.remove("active"));
        const btnavPageMap = { staff: "more", requests: "more", rules: "more", tracking: "more" };
        const btnavKey = btnavPageMap[p] || p;
        const btnavBtn = document.getElementById("btnav-" + btnavKey);
        if (btnavBtn) btnavBtn.classList.add("active");

        if (p === "rules" && typeof window.renderRulesUI === "function") {
          window.renderRulesUI();
          if (typeof window.renderCommandersUI === "function")
            window.renderCommandersUI();
          // אתחול ערכי הגדרות
          const waChk = document.getElementById("settingWaEnabled");
          if (waChk) waChk.checked = window.waPromptEnabled !== false;
          const maxShifts = document.getElementById("settingMaxShifts");
          if (maxShifts)
            maxShifts.value =
              (window.appSettings && window.appSettings.maxShiftsPerWeek) || 5;
          // עדכון סטטוס התראות
          const notifEl = document.getElementById("notifPermStatus");
          if (notifEl) {
            if (!("Notification" in window)) notifEl.textContent = "לא נתמך";
            else if (Notification.permission === "granted") notifEl.textContent = "✅ פעיל";
            else if (Notification.permission === "denied") notifEl.textContent = "❌ חסום";
            else notifEl.textContent = "⚠️ לא הופעל";
          }
          if (typeof window.renderBackupsList === "function")
            window.renderBackupsList();
        }
        if (p === "staff" && typeof window.renderStaff === "function")
          window.renderStaff();
        if (p === "requests" && typeof window.renderRequestsPage === "function")
          window.renderRequestsPage();
        if (p === "tracking" && typeof window.renderTrackingPage === "function")
          window.renderTrackingPage();
        if (p === "tasks" && typeof window.renderTasks === "function") {
          window.renderTasks();
          if (typeof window.renderWeekendJusticeTable === "function")
            window.renderWeekendJusticeTable();
        }
        if (
          p === "worker-requests" &&
          typeof window.renderMyRequestsList === "function"
        )
          window.renderMyRequestsList();
      };

      window.setLocFilter = function (loc) {
        window.currentLocFilter = loc;
        document
          .querySelectorAll(".loc-btn")
          .forEach((b) => b.classList.remove("active-filter"));
        if (event && event.target) event.target.classList.add("active-filter");
        if (typeof window.applyFilters === "function") window.applyFilters();
      };

      window.setRoleFilter = function (role) {
        window.currentRoleFilter = role;
        document
          .querySelectorAll(".role-btn")
          .forEach((b) => b.classList.remove("active-filter"));
        if (event && event.target) event.target.classList.add("active-filter");
        if (typeof window.applyFilters === "function") window.applyFilters();
      };

      window.toggleEmpSelect = function (empName) {
        if (window.selectedEmployees.has(empName))
          window.selectedEmployees.delete(empName);
        else window.selectedEmployees.add(empName);
        if (typeof window.populateEmpFilterDropdown === "function")
          window.populateEmpFilterDropdown();
        if (typeof window.applyFilters === "function") window.applyFilters();
      };

      window.renderRoleFilters = function () {
        let html = `<strong>דרג:</strong><button class="filter-btn active-filter role-btn" onclick="window.setRoleFilter('all')">הצג הכל</button>`;
        window.roleTypes.forEach((rt) => {
          html += `<button class="filter-btn role-btn" onclick="window.setRoleFilter('${rt}')">${rt}</button>`;
        });
        let cont = document.getElementById("roleFilterContainer");
        if (cont) cont.innerHTML = html;
      };

      window.populateEmpFilterDropdown = function () {
        let container = document.getElementById("empMultiSelect");
        if (!container) return;
        let sortedStaff = [...window.staff].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
        let isAllClear = window.selectedEmployees.size === 0 ? "checked" : "";
        let html = `<label><input type="checkbox" onchange="if(this.checked) { window.selectedEmployees.clear(); window.populateEmpFilterDropdown(); window.applyFilters(); }" ${isAllClear}> נקה בחירה (הצג הכל)</label><hr style="margin:5px 0; border-color:var(--md-divider);">`;
        sortedStaff.forEach((e) => {
          let checked = window.selectedEmployees.has(e.name) ? "checked" : "";
          html += `<label><input type="checkbox" value="${e.name}" onchange="window.toggleEmpSelect('${e.name}')" ${checked}> ${e.name}</label>`;
        });
        container.innerHTML = html;
      };

      window.applyFilters = function () {
        let activeEmpFilters = window.selectedEmployees.size > 0;
        document.querySelectorAll(".loc-box").forEach((box) => {
          let matchesLoc =
            window.currentLocFilter === "all" ||
            box.getAttribute("data-loc") === window.currentLocFilter;
          let visibleCount = 0;
          box.querySelectorAll(".name-chip").forEach((chip) => {
            let matchesRole =
              window.currentRoleFilter === "all" ||
              chip.getAttribute("data-role") === window.currentRoleFilter;
            let matchesEmp =
              !activeEmpFilters ||
              window.selectedEmployees.has(chip.getAttribute("data-name"));
            if (matchesRole && matchesEmp) {
              chip.style.display = "inline-flex";
              visibleCount++;
            } else {
              chip.style.display = "none";
            }
          });
          if (
            matchesLoc &&
            (!activeEmpFilters || visibleCount > 0 || window.isEditMode)
          ) {
            box.style.display = "block";
          } else {
            box.style.display = "none";
          }
        });
      };

      window.renderHolidaysLog = function () {
        const tableContainer = document.getElementById("holidaysLogTable");
        const selectEmp = document.getElementById("holLogEmp");
        if (!tableContainer || !selectEmp) return;
        let empOptions =
          `<option value="">-- בחר עובד --</option>` +
          window.staff
            .filter((e) => e.isActive)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((e) => `<option value="${e.name}">${e.name}</option>`)
            .join("");
        if (selectEmp.innerHTML !== empOptions)
          selectEmp.innerHTML = empOptions;
        if (!window.holidaysLog || window.holidaysLog.length === 0) {
          tableContainer.innerHTML =
            "<p style='color:#64748b; font-style:italic;'>אין רישומים במערכת.</p>";
          if (typeof window.renderHolidayStats === "function")
            window.renderHolidayStats();
          return;
        }
        let html = `<table style="width:100%;"><tr><th>שם</th><th>חג / אירוע</th><th>שנה</th><th class="task-action-btn">פעולה</th></tr>`;
        window.holidaysLog.forEach((log) => {
          html += `<tr><td><b>${log.name}</b></td><td>${log.type} ${log.custom ? `(${log.custom})` : ""}</td><td>${log.year}</td><td class="task-action-btn"><button class="btn btn-error" style="padding:2px 8px; font-size:0.75rem;" onclick="window.deleteHolidayLog(${log.id})">מחק</button></td></tr>`;
        });
        html += `</table>`;
        tableContainer.innerHTML = html;
        if (typeof window.renderHolidayStats === "function")
          window.renderHolidayStats();
      };

      window.addHolidayLog = function () {
        let name = document.getElementById("holLogEmp").value;
        let type = document.getElementById("holLogType").value;
        let custom = document.getElementById("holLogCustom").value;
        let year = document.getElementById("holLogYear").value;
        if (!name || !type || !year) {
          alert("יש למלא שם עובד, סוג חג/אירוע ושנה.");
          return;
        }
        let log = {
          id: Date.now(),
          name,
          type,
          custom: type === "אחר" ? custom : "",
          year,
        };
        window.holidaysLog = window.holidaysLog || [];
        window.holidaysLog.push(log);
        if (typeof window.saveToCloud === "function")
          window.saveToCloud("holidaysLog", window.holidaysLog);
        document.getElementById("holLogCustom").value = "";
        document.getElementById("holLogCustom").style.display = "none";
        document.getElementById("holLogType").value = "";
        document.getElementById("holLogEmp").value = "";
      };

      window.deleteHolidayLog = function (id) {
        if (confirm("למחוק את הרישום הזה?")) {
          window.holidaysLog = window.holidaysLog.filter((l) => l.id !== id);
          if (typeof window.saveToCloud === "function")
            window.saveToCloud("holidaysLog", window.holidaysLog);
        }
      };

      // === טבלת הוגנות סופ"ש ===
      window.updateWeekendHistory = function () {
        let weekSun = window.getSunday(window.currentWeekOffset || 0);
        let weekLabel = window.formatWeekString(weekSun);
        let workedThisWeekend = new Set();
        // חמישי-לילה = סופ"ש רק במת"ל
        [
          { loc: LOC_MATAL, shifts: weekendShiftsMATAL },
          { loc: LOC_ZIRA, shifts: weekendShiftsZira },
        ].forEach(({ loc, shifts }) => {
          shifts.forEach((sk) => {
            let [d, s] = sk.split("-");
            let arr =
              window.currentSchedule[`${d}-${s}`] &&
              window.currentSchedule[`${d}-${s}`][loc];
            if (arr) arr.forEach((e) => workedThisWeekend.add(e.id));
          });
        });
        workedThisWeekend.forEach((id) => {
          let emp = window.staff.find((e) => e.id === id);
          if (emp) {
            if (!window.weekendHistory[emp.name])
              window.weekendHistory[emp.name] = [];
            if (!window.weekendHistory[emp.name].includes(weekLabel))
              window.weekendHistory[emp.name].push(weekLabel);
          }
        });
        localStorage.setItem(
          "shift_weekend_history_v1",
          JSON.stringify(window.weekendHistory),
        );
      };

      window.renderWeekendJusticeTable = function () {
        const cont = document.getElementById("weekendJusticeTableContainer");
        if (!cont) return;
        let relevantStaff = (window.staff || [])
          .filter(
            (e) => e.isActive && (e.type === "טכנאי" || e.type === "נחפף"),
          )
          .sort((a, b) => a.name.localeCompare(b.name));
        if (relevantStaff.length === 0) {
          cont.innerHTML =
            "<p style='color:var(--text-muted); font-style:italic;'>אין נתונים.</p>";
          return;
        }
        let html = `<table style="width:100%; text-align:right;">
          <tr style="background:var(--md-bg);">
            <th style="padding:8px; border-bottom:2px solid var(--md-divider);">שם</th>
            <th style="padding:8px; border-bottom:2px solid var(--md-divider); text-align:center;">כמות סופ"שים</th>
            <th style="padding:8px; border-bottom:2px solid var(--md-divider);">סופ"ש אחרון</th>
            <th style="padding:8px; border-bottom:2px solid var(--md-divider);">סטטוס נוכחי</th>
          </tr>`;
        relevantStaff.forEach((e) => {
          let hist = window.weekendHistory[e.name] || [];
          let lastWE = hist.length > 0 ? hist[hist.length - 1] : "—";
          let status = e.isNextWeekend
            ? `<span style="color:var(--md-primary); font-weight:bold;">📅 משובץ לסופ"ש הקרוב</span>`
            : e.workedLastWeekend
              ? `<span style="color:var(--md-warning);">💤 עבד שבת שעברה</span>`
              : `<span style="color:var(--text-muted);">שגרתי</span>`;
          html += `<tr style="border-bottom:1px solid var(--md-divider);">
            <td style="padding:8px;"><b>${e.name}</b> <small style="color:var(--text-muted);">(${e.type})</small></td>
            <td style="padding:8px; text-align:center; font-weight:bold; color:var(--md-secondary);">${hist.length || 0}</td>
            <td style="padding:8px; font-size:0.85rem;">${lastWE}</td>
            <td style="padding:8px;">${status}</td>
          </tr>`;
        });
        html += `</table>`;
        cont.innerHTML = html;
      };

      // הצעת סוגרי סופ"ש — מדרג טכנאים/נחפפים לפי מי שסגר הכי מעט, ומציע לסמן
      window.suggestWeekendClosers = async function () {
        if (typeof window.rebuildWeekendHistory === "function")
          await window.rebuildWeekendHistory(); // רענון מהענן לדיוק
        const wh = window.weekendHistory || {};
        const techs = (window.staff || []).filter(
          (e) =>
            e.isActive !== false &&
            (e.type === "טכנאי" || e.type === "נחפף") &&
            !e.workedLastWeekend,
        );
        if (techs.length === 0) {
          alert("אין טכנאים/נחפפים זמינים לסופ\"ש (כולם עבדו שבת שעברה?).");
          return;
        }
        const ranked = techs
          .map((e) => ({
            emp: e,
            count: (wh[e.name] || []).length,
            last: (wh[e.name] || []).slice(-1)[0] || "—",
          }))
          .sort(
            (a, b) =>
              a.count - b.count || a.emp.name.localeCompare(b.emp.name),
          );
        const topN = 2; // לרוב סוגרים 2; אפשר לסמן עוד ידנית בכרטיס העובד
        let msg = 'מועמדים לסגירת הסופ"ש הקרוב (לפי מי שסגר הכי מעט):\n\n';
        ranked.slice(0, 6).forEach((r, i) => {
          msg += `${i + 1}. ${r.emp.name} — ${r.count} סופ"שים (אחרון: ${r.last})\n`;
        });
        msg += `\nלסמן את ${topN} הראשונים (${ranked
          .slice(0, topN)
          .map((r) => r.emp.name)
          .join(", ")}) כסוגרי הסופ"ש הקרוב?`;
        if (!confirm(msg)) return;
        ranked.slice(0, topN).forEach((r) => {
          r.emp.isNextWeekend = true;
          r.emp.workedLastWeekend = false;
        });
        if (typeof window.renderStaff === "function") window.renderStaff();
        if (typeof window.renderWeekendJusticeTable === "function")
          window.renderWeekendJusticeTable();
        if (typeof window.renderTable === "function")
          window.renderTable(window.currentSchedule, window.currentNotesLog);
        if (typeof window.triggerUnsavedChanges === "function")
          window.triggerUnsavedChanges();
        alert(
          "✅ סומנו כסוגרי הסופ\"ש הקרוב.\nכעת לחץ 'צור מחדש' כדי לשבץ אותם, ואל תשכח לשמור.",
        );
      };

      // חישוב מחדש של היסטוריית הסופ"שים מהלוחות השמורים בענן (16 שבועות אחורה)
      window.rebuildWeekendHistory = async function () {
        const cont = document.getElementById("weekendJusticeTableContainer");
        if (!window._fbImports || !window._firebaseDb) {
          window.renderWeekendJusticeTable();
          return;
        }
        const { ref, get } = window._fbImports;
        if (cont)
          cont.innerHTML =
            "<i style='color:var(--text-muted);'>מחשב מחדש מהענן...</i>";
        const WEEKS_BACK = 16;
        const history = {};
        for (let off = -WEEKS_BACK; off <= 0; off++) {
          const sun = window.getSunday((window.currentWeekOffset || 0) + off);
          const wk = window.getWeekDbKey(sun);
          const label = window.formatWeekString(sun);
          let sched;
          try {
            const snap = await get(ref(window._firebaseDb, "schedules/" + wk));
            if (!snap.exists()) continue;
            sched = snap.val();
          } catch (e) {
            continue;
          }
          const workers = new Set();
          [
            { loc: LOC_MATAL, shifts: weekendShiftsMATAL },
            { loc: LOC_ZIRA, shifts: weekendShiftsZira },
          ].forEach(({ loc, shifts }) => {
            shifts.forEach((sk) => {
              const [d, s] = sk.split("-");
              const arr = sched[`${d}-${s}`] && sched[`${d}-${s}`][loc];
              if (arr)
                arr.forEach((e) => {
                  if (e && e.name) workers.add(e.name);
                });
            });
          });
          workers.forEach((name) => {
            if (!history[name]) history[name] = [];
            history[name].push(label); // מסודר כרונולוגית (ישן → חדש)
          });
        }
        window.weekendHistory = history;
        try {
          localStorage.setItem(
            "shift_weekend_history_v1",
            JSON.stringify(history),
          );
        } catch (e) {}
        window.renderWeekendJusticeTable();
      };

      window.showCommanderSelectForWA = function () {
        const modal = document.getElementById("commanderSelectModal");
        const list = document.getElementById("commanderSelectList");
        if (!modal || !list) return;
        list.innerHTML = "";
        const cmds =
          window.commanders && window.commanders.length > 0
            ? window.commanders
            : [{ id: 0, name: "אביחי כהן", phone: "0522911379" }];
        cmds.forEach((cmd) => {
          const btn = document.createElement("button");
          btn.className = "btn btn-contained";
          btn.style.cssText =
            "width:100%; padding:14px; font-size:1rem; text-align:right; justify-content:flex-start; gap:12px;";
          btn.innerHTML = `📱 <strong>${cmd.name}</strong> <span style="opacity:0.7; font-size:0.85em; margin-right:auto;" dir="ltr">${cmd.phone}</span>`;
          btn.onclick = function () {
            modal.style.display = "none";
            let cleanPhone = cmd.phone.replace(/\D/g, "");
            if (cleanPhone.startsWith("0"))
              cleanPhone = "972" + cleanPhone.substring(1);
            let encodedMsg = encodeURIComponent(window._pendingWAMsg || "");
            window.open(
              `https://wa.me/${cleanPhone}?text=${encodedMsg}`,
              "_blank",
            );
          };
          list.appendChild(btn);
        });
        modal.style.display = "flex";
      };

      window.renderCommandersUI = function () {
        const cont = document.getElementById("commandersListUI");
        if (!cont) return;
        if (!window.commanders || window.commanders.length === 0) {
          cont.innerHTML =
            "<p style='color:var(--text-muted); font-style:italic;'>אין מפקדים מוגדרים.</p>";
          return;
        }
        let html = `<table style="width:100%; text-align:right;"><tr><th>שם</th><th>טלפון</th><th style="width:70px;">פעולה</th></tr>`;
        window.commanders.forEach((cmd) => {
          const fromEmp = cmd.empId
            ? " <span style='font-size:0.7em; color:var(--text-muted);'>(מכרטיסיית עובד)</span>"
            : "";
          html += `<tr style="border-bottom:1px solid var(--md-divider);">
            <td style="padding:8px;"><b>${cmd.name}</b>${fromEmp}</td>
            <td style="padding:8px;" dir="ltr">${cmd.phone}</td>
            <td style="padding:8px;"><button class="btn btn-error" style="padding:2px 8px; font-size:0.75rem;" onclick="window.deleteCommander(${cmd.id})">מחק</button></td>
          </tr>`;
        });
        html += `</table>`;
        cont.innerHTML = html;
      };

      window.addCommander = function () {
        const name = document.getElementById("newCmdName").value.trim();
        const phone = document.getElementById("newCmdPhone").value.trim();
        if (!name || !phone) {
          alert("נא למלא שם וטלפון.");
          return;
        }
        window.commanders.push({ id: Date.now(), name, phone });
        localStorage.setItem(
          "shift_commanders_v1",
          JSON.stringify(window.commanders),
        );
        document.getElementById("newCmdName").value = "";
        document.getElementById("newCmdPhone").value = "";
        window.renderCommandersUI();
      };

      window.deleteCommander = function (id) {
        if (!confirm("למחוק מפקד זה מהרשימה?")) return;
        window.commanders = window.commanders.filter((c) => c.id !== id);
        localStorage.setItem(
          "shift_commanders_v1",
          JSON.stringify(window.commanders),
        );
        window.renderCommandersUI();
      };

      window.renderTasks = function () {
        let assigneeHtml = `<option value="">-- הקצה לעובד (חובה) --</option>`;
        window.staff
          .filter((e) => e.isActive !== false && (e.type === "טכנאי" || e.type === "נחפף"))
          .forEach((e) => {
            assigneeHtml += `<option value="${e.name}">${e.name} (${e.type})</option>`;
          });
        let empAssignee = document.getElementById("newTaskAssignee");
        if (empAssignee) empAssignee.innerHTML = assigneeHtml;
        let catHtml = "";
        window.taskCategories.forEach((c) => {
          catHtml += `<option value="${c}">${c}</option>`;
        });
        let catSel = document.getElementById("newTaskCategory");
        if (catSel) catSel.innerHTML = catHtml;
        if (typeof window.renderTaskStats === "function")
          window.renderTaskStats();
        if (typeof window.renderHolidaysLog === "function")
          window.renderHolidaysLog();
        if (typeof window.renderEmployeeSummary === "function")
          window.renderEmployeeSummary();
        let html = "";
        if (window.systemTasks.length === 0) {
          html = `<div style="text-align:center; color:var(--text-muted); padding:20px;">אין משימות פתוחות כרגע.</div>`;
        } else {
          // מיון לפי תאריך (מוקדם למאוחר); משימות ללא תאריך בסוף
          let sortedTasks = [...window.systemTasks].sort((a, b) => {
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;
            return a.date.localeCompare(b.date);
          });
          html = `<table style="width:100%; border-collapse:collapse; text-align:right; table-layout:fixed;">
            <tr style="background:var(--md-bg);">
              <th style="padding:8px; border-bottom:2px solid var(--md-divider); width:70px;">תאריך</th>
              <th style="padding:8px; border-bottom:2px solid var(--md-divider);">משימה</th>
              <th style="padding:8px; border-bottom:2px solid var(--md-divider); width:80px;">עובד</th>
              <th style="padding:8px; border-bottom:2px solid var(--md-divider); width:60px;" class="task-action-btn"></th>
            </tr>`;
          sortedTasks.forEach((t) => {
            let dateStr = t.date ? t.date.split("-").reverse().join(".") : "—";
            if (t.endDate && t.endDate > t.date)
              dateStr += " – " + t.endDate.split("-").reverse().join(".");
            let rowStyle = t.completed
              ? "opacity:0.55; text-decoration:line-through;"
              : "";
            let btnText = t.completed ? "↩" : "✔";
            html += `<tr style="border-bottom:1px solid var(--md-divider); ${rowStyle}">
              <td style="padding:8px; font-size:0.8rem; word-break:break-word;">${dateStr}</td>
              <td style="padding:8px; word-break:break-word;"><strong style="color:var(--md-primary);">[${t.category || ""}]</strong>${t.desc ? " " + t.desc : ""}</td>
              <td style="padding:8px; font-size:0.8rem; word-break:break-word;">${(t.assignees && t.assignees.length > 0 ? t.assignees.map(a => a.name).join(", ") : t.assignee) || "<span style='color:var(--text-muted);'>—</span>"}</td>
              <td style="padding:6px; text-align:center;" class="task-action-btn">
                <button class="btn btn-outlined" title="${t.completed ? "בטל סיום" : "סמן כבוצע"}" style="padding:2px 6px; font-size:0.85rem; min-width:auto;" onclick="window.toggleTaskStatus(${t.id})">${btnText}</button>
                <button class="btn btn-error" title="מחק" style="padding:2px 6px; font-size:0.85rem; min-width:auto; margin-top:4px;" onclick="window.deleteTask(${t.id})">🗑</button>
              </td>
            </tr>`;
          });
          html += `</table>`;
        }
        let taskList = document.getElementById("tasksList");
        if (taskList) taskList.innerHTML = html;
      };

      window.renderTaskStats = function () {
        let relevantStaff = window.staff.filter(
          (e) => e.isActive && (e.type === "טכנאי" || e.type === "נחפף"),
        );

        // ספירת משימות שהושלמו לפי עובד וקטגוריה
        let taskCounts = {};
        relevantStaff.forEach((e) => {
          taskCounts[e.name] = { total: 0, byCat: {} };
        });
        window.systemTasks.forEach((t) => {
          if (!t.completed) return;
          // תמיכה גם ב-assignees (מערך) וגם ב-assignee (ישן)
          const participants = t.assignees && t.assignees.length > 0
            ? t.assignees.map((a) => a.name)
            : (t.assignee ? [t.assignee] : []);
          participants.forEach((name) => {
            if (taskCounts[name]) {
              taskCounts[name].total++;
              taskCounts[name].byCat[t.category] = (taskCounts[name].byCat[t.category] || 0) + 1;
            }
          });
        });

        // ספירת חגים לכל עובד
        let holCounts = {};
        (window.holidaysLog || []).forEach((log) => {
          if (log.name) holCounts[log.name] = (holCounts[log.name] || 0) + 1;
        });

        let sorted = [...relevantStaff].sort(
          (a, b) =>
            window.roleTypes.indexOf(a.type) - window.roleTypes.indexOf(b.type),
        );

        let html = `<table style="width:100%; border-collapse:collapse; text-align:right; table-layout:fixed;">
          <tr style="background:var(--md-bg);">
            <th style="padding:8px; border-bottom:2px solid var(--md-divider);">שם העובד</th>
            <th style="padding:8px; border-bottom:2px solid var(--md-divider); text-align:center; width:90px;">משימות</th>
            <th style="padding:8px; border-bottom:2px solid var(--md-divider); text-align:center; width:70px;">חגים</th>
          </tr>`;
        sorted.forEach((e) => {
          let tc = taskCounts[e.name];
          let cats = Object.keys(tc.byCat);
          let catLine =
            cats.length > 0
              ? `<div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px; white-space:normal;">${cats.map((c) => `${c}: ${tc.byCat[c]}`).join(" · ")}</div>`
              : "";
          let hol = holCounts[e.name] || 0;
          html += `<tr style="border-bottom:1px solid var(--md-divider);">
            <td style="padding:8px; word-break:break-word;"><strong>${e.name}</strong> <span style="font-size:0.7em; color:var(--text-muted);">(${e.type})</span>${catLine}</td>
            <td style="padding:8px; text-align:center; color:var(--md-success); font-weight:bold; font-size:1.1em;">${tc.total > 0 ? tc.total : "<span style='color:var(--md-divider);'>-</span>"}</td>
            <td style="padding:8px; text-align:center; color:var(--md-secondary); font-weight:bold; font-size:1.1em;">${hol > 0 ? hol : "<span style='color:var(--md-divider);'>-</span>"}</td>
          </tr>`;
        });
        html += `</table>`;

        let tsc = document.getElementById("taskStatsContainer");
        if (tsc) tsc.innerHTML = html;
      };

      window.renderHolidayStats = function () {
        // נשמר לתאימות לאחור — הספירה כעת מוצגת בטבלת "סטטוס משימות וחגים"
        let hsc = document.getElementById("holidayStatsContainer");
        if (hsc) hsc.innerHTML = "";
        if (typeof window.renderEmployeeSummary === "function")
          window.renderEmployeeSummary();
      };

      window.renderEmployeeSummary = function () {
        let sel = document.getElementById("employeeSummarySelect");
        let content = document.getElementById("employeeSummaryContent");
        if (!sel || !content) return;

        // מילוי רשימת העובדים (שמירה על הבחירה הקיימת)
        let current = sel.value;
        let opts =
          `<option value="">-- בחר עובד --</option>` +
          window.staff
            .filter((e) => e.isActive)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(
              (e) =>
                `<option value="${e.name}" ${e.name === current ? "selected" : ""}>${e.name}</option>`,
            )
            .join("");
        if (sel.dataset.lastOpts !== opts) {
          sel.innerHTML = opts;
          sel.dataset.lastOpts = opts;
          sel.value = current;
        }

        let name = sel.value;
        if (!name) {
          content.innerHTML =
            "<p style='color:var(--text-muted); font-style:italic; margin:0;'>בחר עובד כדי לראות את המשימות והחגים שלו.</p>";
          return;
        }

        // משימות של העובד
        let empTasks = (window.systemTasks || []).filter(
          (t) => t.assignee === name,
        );
        let done = empTasks.filter((t) => t.completed);
        let open = empTasks.filter((t) => !t.completed);

        // חגים שסגר
        let empHolidays = (window.holidaysLog || []).filter(
          (l) => l.name === name,
        );

        let html = "";

        // סיכום מהיר
        html += `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px;">
          <div style="flex:1; min-width:90px; text-align:center; background:var(--md-bg); border-radius:8px; padding:10px;">
            <div style="font-size:1.4rem; font-weight:bold; color:var(--md-success);">${done.length}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">בוצעו</div>
          </div>
          <div style="flex:1; min-width:90px; text-align:center; background:var(--md-bg); border-radius:8px; padding:10px;">
            <div style="font-size:1.4rem; font-weight:bold; color:var(--md-warning);">${open.length}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">פתוחות</div>
          </div>
          <div style="flex:1; min-width:90px; text-align:center; background:var(--md-bg); border-radius:8px; padding:10px;">
            <div style="font-size:1.4rem; font-weight:bold; color:var(--md-secondary);">${empHolidays.length}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">חגים שנסגרו</div>
          </div>
        </div>`;

        // טבלת משימות
        html += `<h4 style="margin:8px 0; color:var(--md-primary);">📋 משימות</h4>`;
        if (empTasks.length === 0) {
          html += `<p style="color:var(--text-muted); font-size:0.85rem; margin:0 0 12px;">אין משימות.</p>`;
        } else {
          let sortedT = [...empTasks].sort((a, b) => {
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;
            return a.date.localeCompare(b.date);
          });
          html += `<div style="overflow-x:auto; margin-bottom:12px;"><table style="width:100%; border-collapse:collapse; text-align:right; font-size:0.85rem;">
            <tr style="background:var(--md-bg);">
              <th style="padding:6px; border-bottom:1px solid var(--md-divider);">תאריך</th>
              <th style="padding:6px; border-bottom:1px solid var(--md-divider);">משימה</th>
              <th style="padding:6px; border-bottom:1px solid var(--md-divider); text-align:center;">סטטוס</th>
            </tr>`;
          sortedT.forEach((t) => {
            let dateStr = t.date ? t.date.split("-").reverse().join(".") : "—";
            let status = t.completed
              ? `<span style="color:var(--md-success);">✔ בוצע</span>`
              : `<span style="color:var(--md-warning);">פתוח</span>`;
            html += `<tr style="border-bottom:1px solid var(--md-divider);">
              <td style="padding:6px; white-space:nowrap;">${dateStr}</td>
              <td style="padding:6px;"><b style="color:var(--md-primary);">[${t.category || ""}]</b>${t.desc ? " " + t.desc : ""}</td>
              <td style="padding:6px; text-align:center; white-space:nowrap;">${status}</td>
            </tr>`;
          });
          html += `</table></div>`;
        }

        // טבלת חגים
        html += `<h4 style="margin:8px 0; color:var(--md-secondary);">🎄 חגים שנסגרו</h4>`;
        if (empHolidays.length === 0) {
          html += `<p style="color:var(--text-muted); font-size:0.85rem; margin:0;">אין רישומי חגים.</p>`;
        } else {
          html += `<div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse; text-align:right; font-size:0.85rem;">
            <tr style="background:var(--md-bg);">
              <th style="padding:6px; border-bottom:1px solid var(--md-divider);">חג / אירוע</th>
              <th style="padding:6px; border-bottom:1px solid var(--md-divider); text-align:center;">שנה</th>
            </tr>`;
          empHolidays.forEach((l) => {
            html += `<tr style="border-bottom:1px solid var(--md-divider);">
              <td style="padding:6px;">${l.type} ${l.custom ? `(${l.custom})` : ""}</td>
              <td style="padding:6px; text-align:center;">${l.year}</td>
            </tr>`;
          });
          html += `</table></div>`;
        }

        content.innerHTML = html;
      };

      window.addNewTaskCategory = function () {
        let newCat = prompt("הכנס שם קטגוריית משימה חדשה:");
        if (newCat && newCat.trim() !== "") {
          if (!window.taskCategories.includes(newCat.trim())) {
            window.taskCategories.push(newCat.trim());
            localStorage.setItem(
              "shift_task_categories_v47",
              JSON.stringify(window.taskCategories),
            );
            window.renderTasks();
          }
        }
      };

      window.toggleSpecDayMode = function () {
        const single = document.getElementById("specSingleDay")?.checked;
        const endWrap = document.getElementById("specEndDateWrapper");
        if (endWrap) endWrap.style.display = single ? "none" : "block";
        if (single) {
          const sd = document.getElementById("specStartDate");
          const ed = document.getElementById("specEndDate");
          if (sd && ed) ed.value = sd.value;
        }
      };

      window.toggleSpecParticipantMode = function () {
        const multi = document.getElementById("specMultiParticipant")?.checked;
        const singleWrap = document.getElementById("specSingleEmpWrapper");
        const multiWrap = document.getElementById("specMultiEmpWrapper");
        if (singleWrap) singleWrap.style.display = multi ? "none" : "block";
        if (multiWrap) multiWrap.style.display = multi ? "flex" : "none";
        if (multi && document.getElementById("specParticipantRows")?.children.length === 0)
          window.addSpecParticipantRow();
      };

      window.addSpecParticipantRow = function () {
        const container = document.getElementById("specParticipantRows");
        if (!container) return;
        const activeStaff = (window.staff || []).filter((e) => e.isActive !== false);
        const opts = activeStaff.map((e) => `<option value="${e.id}">${e.name}</option>`).join("");
        const row = document.createElement("div");
        row.style.cssText = "display:flex; gap:6px; align-items:center;";
        row.innerHTML = `<select class="spec-participant-select" style="flex:1;"><option value="">-- בחר עובד --</option>${opts}</select><button class="btn btn-error" style="padding:2px 8px;" onclick="this.parentElement.remove()">✕</button>`;
        container.appendChild(row);
      };

      window.toggleTaskDayMode = function () {
        const single = document.getElementById("taskSingleDay")?.checked;
        const endField = document.getElementById("taskEndDateField");
        if (endField) endField.style.display = single ? "none" : "block";
      };

      window.toggleTaskParticipantMode = function () {
        const multi = document.getElementById("taskMultiParticipant")?.checked;
        const singleWrap = document.getElementById("taskSingleAssigneeWrapper");
        const multiWrap = document.getElementById("taskMultiAssigneeWrapper");
        if (singleWrap) singleWrap.style.display = multi ? "none" : "block";
        if (multiWrap) multiWrap.style.display = multi ? "flex" : "none";
        if (multi && document.getElementById("taskParticipantRows")?.children.length === 0)
          window.addTaskParticipantRow();
      };

      window.addTaskParticipantRow = function () {
        const container = document.getElementById("taskParticipantRows");
        if (!container) return;
        const activeStaff = (window.staff || []).filter((e) => e.isActive !== false && (e.type === "טכנאי" || e.type === "נחפף"));
        const opts = activeStaff.map((e) => `<option value="${e.name}">${e.name} (${e.type})</option>`).join("");
        const row = document.createElement("div");
        row.style.cssText = "display:flex; gap:6px; align-items:center;";
        row.innerHTML = `<select class="task-participant-select" style="flex:1;">${opts}</select><button class="btn btn-error" style="padding:2px 8px;" onclick="this.parentElement.remove()">✕</button>`;
        container.appendChild(row);
      };

      // סנכרון משימה עם specialStatuses גלובלי
      window.syncTaskSpecialStatus = function (task) {
        window.specialStatuses = (window.specialStatuses || []).filter((s) => s.taskId !== task.id);
        if (!task.completed && task.date) {
          const assignees = task.assignees || (task.assignee ? [{ name: task.assignee }] : []);
          assignees.forEach((a) => {
            const emp = (window.staff || []).find((e) => e.name === a.name || e.id === a.id);
            if (!emp) return;
            window.specialStatuses.push({
              id: Date.now() + Math.floor(Math.random() * 10000),
              empId: emp.id, empName: emp.name,
              status: task.category || "משימה",
              text: task.desc || "",
              startDate: task.date,
              endDate: task.endDate || task.date,
              taskId: task.id,
            });
          });
        }
        window.saveToCloud("specialStatuses", window.specialStatuses);
      };

      window.addTask = function () {
        const category = document.getElementById("newTaskCategory").value.trim();
        const desc = document.getElementById("newTaskDesc").value.trim();
        const isSingleDay = document.getElementById("taskSingleDay")?.checked;
        const isMulti = document.getElementById("taskMultiParticipant")?.checked;
        const date = document.getElementById("newTaskDate").value;
        const endDateEl = document.getElementById("newTaskEndDate");
        const endDate = (!isSingleDay && endDateEl) ? endDateEl.value : "";
        if (!category) { alert("יש לבחור קטגוריית משימה!"); return; }
        if (!date) { alert("יש לבחור תאריך!"); return; }

        let assignees = [];
        if (isMulti) {
          const rows = document.querySelectorAll(".task-participant-select");
          rows.forEach((sel) => { if (sel.value) assignees.push({ name: sel.value }); });
          if (assignees.length === 0) { alert("יש לבחור לפחות עובד אחד!"); return; }
        } else {
          const assignee = document.getElementById("newTaskAssignee").value;
          if (!assignee) { alert("יש לבחור עובד למשימה!"); return; }
          assignees = [{ name: assignee }];
        }

        const task = {
          id: Date.now(),
          category, desc,
          assignees,
          assignee: assignees[0]?.name || "",
          date,
          completed: false,
        };
        if (!isSingleDay && endDate && endDate > date) task.endDate = endDate;
        window.systemTasks.push(task);
        localStorage.setItem("shift_tasks_v47", JSON.stringify(window.systemTasks));
        window.syncTaskSpecialStatus(task);
        document.getElementById("newTaskDesc").value = "";
        document.getElementById("newTaskDate").value = "";
        if (endDateEl) endDateEl.value = "";
        window.renderTasks();
        window.triggerUnsavedChanges();
      };

      window.toggleTaskStatus = function (id) {
        let t = window.systemTasks.find((x) => x.id === id);
        if (t) {
          t.completed = !t.completed;
          localStorage.setItem("shift_tasks_v47", JSON.stringify(window.systemTasks));
          window.syncTaskSpecialStatus(t);
          window.renderTasks();
          window.triggerUnsavedChanges();
        }
      };

      window.deleteTask = function (id) {
        if (confirm("למחוק את המשימה?")) {
          const task = window.systemTasks.find((x) => x.id === id);
          window.systemTasks = window.systemTasks.filter((x) => x.id !== id);
          localStorage.setItem("shift_tasks_v47", JSON.stringify(window.systemTasks));
          if (task) {
            window.specialStatuses = (window.specialStatuses || []).filter((s) => s.taskId !== id);
            window.saveToCloud("specialStatuses", window.specialStatuses);
          }
          window.renderTasks();
          window.triggerUnsavedChanges();
        }
      };

      window.renderRulesUI = function () {
        let selectElem = document.getElementById("rulesModeSelect");
        if (!selectElem) return;
        if (!window.rules) return;
        const mode = selectElem.value || "normal";
        let sHC = document.getElementById("shiftHoursContainer");
        let hWrap = document.getElementById("holidaysWrapper");
        let rCont = document.getElementById("rulesContainer");
        if (mode === "emergency") {
          if (sHC) sHC.innerHTML = "";
          if (hWrap) hWrap.classList.add("emergency-hidden");
          let html = `<div class="rotation-group"><h4>🚨 הגדרות צוותי קרב (סבבי 24/48)</h4><p style="font-size:0.85em; color:var(--text-muted);">המשמרות פועלות במחזורים של 24 שעות.</p>`;
          for (let i = 0; i < 3; i++) {
            let dStr =
              i === 0
                ? "ראשון, רביעי, שבת"
                : i === 1
                  ? "שני, חמישי"
                  : "שלישי, שישי";
            html += `<div style="background:var(--card-bg); padding:15px; border-radius:6px; border:1px solid var(--border-color); margin-bottom:10px;"><strong style="color:var(--md-error);">צוות ${i + 1} (ימים: ${dStr})</strong><div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:8px;"><div style="flex:1; min-width:180px;"><label style="font-size:0.8em; color:var(--text-muted);">זירה - 24 שעות:</label><br><input type="text" id="ziraFull_${i}" value="${window.emRotations.zira[i].full.join(", ")}" style="width:100%; padding:4px;"></div><div style="flex:1; min-width:180px;"><label style="font-size:0.8em; color:var(--text-muted);">זירה - (עד הערב):</label><br><input type="text" id="ziraPart_${i}" value="${window.emRotations.zira[i].part.join(", ")}" style="width:100%; padding:4px;"></div><div style="flex:1; min-width:180px;"><label style="font-size:0.8em; color:var(--text-muted);">מפקד 200:</label><br><input type="text" id="m200Man_${i}" value="${window.emRotations.m200[i].manager}" style="width:100%; padding:4px;"></div><div style="flex:2; min-width:250px;"><label style="font-size:0.8em; color:var(--text-muted);">עובדים אחרים (ב-200):</label><br><input type="text" id="m200Workers_${i}" value="${window.emRotations.m200[i].workers.join(", ")}" style="width:100%; padding:4px;"></div></div></div>`;
          }
          html += `</div>`;
          if (rCont) rCont.innerHTML = html;
        } else {
          const _activeTimes = window._weekShiftTimes || shiftTimesByLoc || {};
          const stM = _activeTimes[LOC_MATAL] || {};
          const stZ = _activeTimes[LOC_ZIRA] || {};
          let timeHtml = `<div class="card-paper" style="border-left: 4px solid var(--md-primary);">
            <h3 style="color:var(--md-primary); margin-top:0;">⏰ שעות פעילות המשמרות (לפי מיקום)</h3>
            <div style="display:flex; gap:24px; flex-wrap:wrap;">
              <div style="flex:1; min-width:200px;">
                <strong style="display:block; margin-bottom:10px; color:var(--md-primary);">🏢 מת"ל / 200</strong>
                <div style="display:flex; flex-direction:column; gap:8px;">
                  <div><label style="display:block; margin-bottom:4px; font-size:0.85rem;">בוקר:</label><input type="text" id="timeInput_MATAL_בוקר" value="${stM["בוקר"] || "08:30 - 17:30"}" style="width:100%;"></div>
                  <div><label style="display:block; margin-bottom:4px; font-size:0.85rem;">לילה:</label><input type="text" id="timeInput_MATAL_לילה" value="${stM["לילה"] || "20:00 - 08:30"}" style="width:100%;"></div>
                  <div><label style="display:block; margin-bottom:4px; font-size:0.85rem;">⚠️ 24ש (חוסר):</label><input type="text" id="timeInput_MATAL_24שעות" value="${stM["24 שעות"] || "08:30 - 08:30"}" style="width:100%;"></div>
                </div>
              </div>
              <div style="flex:1; min-width:200px;">
                <strong style="display:block; margin-bottom:10px; color:var(--md-secondary);">🎯 זירה</strong>
                <div style="display:flex; flex-direction:column; gap:8px;">
                  <div><label style="display:block; margin-bottom:4px; font-size:0.85rem;">בוקר:</label><input type="text" id="timeInput_ZIRA_בוקר" value="${stZ["בוקר"] || "08:30 - 17:30"}" style="width:100%;"></div>
                  <div><label style="display:block; margin-bottom:4px; font-size:0.85rem;">ערב:</label><input type="text" id="timeInput_ZIRA_ערב" value="${stZ["ערב"] || "12:00 - 20:00"}" style="width:100%;"></div>
                  <div><label style="display:block; margin-bottom:4px; font-size:0.85rem;">לילה:</label><input type="text" id="timeInput_ZIRA_לילה" value="${stZ["לילה"] || "20:00 - 08:30"}" style="width:100%;"></div>
                </div>
              </div>
            </div>
          </div>`;
          if (sHC) sHC.innerHTML = timeHtml;
          if (hWrap) hWrap.classList.remove("emergency-hidden");
          let holHtml = "";
          days.slice(0, 5).forEach((d) => {
            holHtml += `<label style="display:flex; align-items:center; gap:4px; font-weight:500;"><input type="checkbox" style="width:16px;height:16px;accent-color:var(--md-success);" onchange="window.toggleHoliday('${d}')" ${window.holidays.includes(d) ? "checked" : ""}> ${d}</label>`;
          });
          let hC = document.getElementById("holidaysContainer");
          if (hC) hC.innerHTML = holHtml;

          let html = "";
          baseLocs.forEach((baseLoc) => {
            if (!window.rules[baseLoc]) return; // הגנה מפני rules חלקי
            let safeLocId = baseLoc === 'מת"ל' ? "MATAL" : "ZIRA"; // נטרול המירכאות במזהה!
            html += `<div class="rule-card"><h3 style="margin-top:0;">🏢 ${baseLoc}</h3>`;
            const scenarios = [
              {
                key: "weekday_בוקר",
                name: "בוקר — כח אדם נוסף (מעבר לקבינט בכיר האוטומטי)",
              },
              { key: "weekday_ערב", name: "אמצע שבוע - ערב" },
              { key: "weekday_לילה", name: "אמצע שבוע - לילה" },
              { key: "weekend", name: "סופש וחגים" },
              ...(baseLoc === LOC_MATAL
                ? [{ key: "weekday_24 שעות", name: "⚠️ מצב חוסר — 24ש מת\"ל (כמות ותפקידים)" }]
                : []),
            ];
            scenarios.forEach((scen) => {
              const _raw =
                window.rules[baseLoc] && window.rules[baseLoc][scen.key]
                  ? window.rules[baseLoc][scen.key]
                  : {};
              const r = {
                count: _raw.count || 0,
                roles: Array.isArray(_raw.roles) ? _raw.roles : [],
                required: (_raw.required && typeof _raw.required === "object") ? _raw.required : {},
                note: _raw.note || "",
              };
              const noteVal = r.note || "";
              const safeKey = scen.key.replace(/\s+/g, "_"); // מזהה HTML תקני (ללא רווחים)
              html += `<div class="rule-grid">
                <strong>${scen.name}:</strong>
                <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                  <div><span style="font-size:0.8rem; color:var(--text-muted);">כמות:</span><br><input type="number" id="count_${safeLocId}_${safeKey}" value="${r.count}" style="width:60px; margin-top:4px;"></div>
                  <div style="flex:1; min-width:150px;"><span style="font-size:0.8rem; color:var(--text-muted);">הערה / סיבה מיוחדת:</span><br><input type="text" id="note_${safeLocId}_${safeKey}" value="${noteVal}" placeholder="לדוג': צורך מיוחד הזמנת..." style="width:100%; margin-top:4px; font-size:0.85rem;"></div>
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:6px;"><span style="display:block; width:100%; color:var(--text-muted); font-size:0.85em; margin-bottom:4px;">מורשים וחובת שיבוץ:</span>${window.roleTypes
                  .map((rt) => {
                    const isChecked = r.roles.includes(rt);
                    const reqCount =
                      r.required && r.required[rt] ? r.required[rt] : 0;
                    return `<div style="display:inline-flex; align-items:center; background:var(--bg); padding:6px 10px; border-radius:4px; border:1px solid var(--border-color);"><label style="cursor:pointer; display:flex; align-items:center; gap:6px; font-size:0.85em;"><input type="checkbox" style="accent-color:var(--accent); width:14px; height:14px;" id="role_${safeLocId}_${safeKey}_${rt.replace(/\s+/g, "")}" ${isChecked ? "checked" : ""} onchange="document.getElementById('req_${safeLocId}_${safeKey}_${rt.replace(/\s+/g, "")}').style.display=this.checked?'inline-block':'none'"> ${rt}</label><input type="number" id="req_${safeLocId}_${safeKey}_${rt.replace(/\s+/g, "")}" value="${reqCount}" min="0" max="5" style="width:40px; margin-right:12px; padding:2px 4px; ${isChecked ? "" : "display:none;"}"></div>`;
                  })
                  .join("")}</div>
              </div>`;
            });
            html += `</div>`;
          });
          if (rCont) rCont.innerHTML = html;
        }
      };

      window.toggleHoliday = function (day) {
        if (window.holidays.includes(day))
          window.holidays = window.holidays.filter((d) => d !== day);
        else window.holidays.push(day);
      };

      window.saveRules = function (scope) {
        const selectElem = document.getElementById("rulesModeSelect");
        const mode = selectElem ? selectElem.value : "normal";
        if (mode === "emergency") {
          for (let i = 0; i < 3; i++) {
            let fullEl = document.getElementById(`ziraFull_${i}`);
            if (fullEl)
              window.emRotations.zira[i].full = fullEl.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
            let partEl = document.getElementById(`ziraPart_${i}`);
            if (partEl)
              window.emRotations.zira[i].part = partEl.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
            let m200M = document.getElementById(`m200Man_${i}`);
            if (m200M) window.emRotations.m200[i].manager = m200M.value.trim();
            let m200W = document.getElementById(`m200Workers_${i}`);
            if (m200W)
              window.emRotations.m200[i].workers = m200W.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
          }
          localStorage.setItem(
            "shift_em_rotations_v47",
            JSON.stringify(window.emRotations),
          );
          alert("הגדרות חירום נשמרו");
          window.triggerUnsavedChanges();
          return;
        }

        // --- שמירת שעות משמרות ---
        const locMap = { MATAL: LOC_MATAL, ZIRA: LOC_ZIRA };
        Object.entries(locMap).forEach(([locId, loc]) => {
          if (!shiftTimesByLoc[loc]) shiftTimesByLoc[loc] = {};
          ["בוקר", "ערב", "לילה"].forEach((shift) => {
            let el = document.getElementById(`timeInput_${locId}_${shift}`);
            if (el) shiftTimesByLoc[loc][shift] = el.value;
          });
        });
        // שמירת שעת 24ש מת"ל בנפרד
        const el24 = document.getElementById("timeInput_MATAL_24שעות");
        if (el24) {
          if (!shiftTimesByLoc[LOC_MATAL]) shiftTimesByLoc[LOC_MATAL] = {};
          shiftTimesByLoc[LOC_MATAL]["24 שעות"] = el24.value;
        }
        // עדכון _weekShiftTimes גם (משמש ב-getShiftTime)
        window._weekShiftTimes = JSON.parse(JSON.stringify(shiftTimesByLoc));
        localStorage.setItem(
          "shift_times_byloc_v1",
          JSON.stringify(shiftTimesByLoc),
        );
        localStorage.setItem(
          "shift_holidays_v47",
          JSON.stringify(window.holidays),
        );

        // --- פרסור כללי המשמרות מה-UI ---
        baseLocs.forEach((baseLoc) => {
          if (!window.rules[baseLoc]) window.rules[baseLoc] = {};
          let safeLocId = baseLoc === 'מת"ל' ? "MATAL" : "ZIRA";
          const scenKeys = baseLoc === LOC_MATAL
            ? ["weekday_בוקר", "weekday_ערב", "weekday_לילה", "weekend", "weekday_24 שעות"]
            : ["weekday_בוקר", "weekday_ערב", "weekday_לילה", "weekend"];
          scenKeys.forEach(
            (scen) => {
              const safeScen = scen.replace(/\s+/g, "_"); // מזהה HTML תקני
              if (!window.rules[baseLoc][scen])
                window.rules[baseLoc][scen] = {
                  count: 0,
                  roles: [],
                  required: {},
                  note: "",
                };
              let countEl = document.getElementById(
                `count_${safeLocId}_${safeScen}`,
              );
              if (countEl)
                window.rules[baseLoc][scen].count =
                  parseInt(countEl.value) || 0;
              let noteEl = document.getElementById(`note_${safeLocId}_${safeScen}`);
              if (noteEl) window.rules[baseLoc][scen].note = noteEl.value;
              window.rules[baseLoc][scen].roles = [];
              window.rules[baseLoc][scen].required = {};
              window.roleTypes.forEach((rt) => {
                const cb = document.getElementById(
                  `role_${safeLocId}_${safeScen}_${rt.replace(/\s+/g, "")}`,
                );
                if (cb && cb.checked) {
                  window.rules[baseLoc][scen].roles.push(rt);
                  const reqEl = document.getElementById(
                    `req_${safeLocId}_${safeScen}_${rt.replace(/\s+/g, "")}`,
                  );
                  const reqVal = reqEl ? parseInt(reqEl.value) : 0;
                  if (reqVal > 0)
                    window.rules[baseLoc][scen].required[rt] = reqVal;
                }
              });
            },
          );
        });
        localStorage.setItem("shift_rules_v47", JSON.stringify(window.rules));

        // --- שמירה לפי scope ---
        if (scope === "global") {
          // שמירה כברירת מחדל גלובלית לכל השבועות
          window.globalRulesDefault = JSON.parse(JSON.stringify(window.rules));
          if (typeof window.saveToCloud === "function") {
            window.saveToCloud("globalRules", window.rules);
            window.saveToCloud("globalShiftTimes", shiftTimesByLoc);
          }
          // הסרת override ייחודי לשבוע הנוכחי אם היה
          if (window.currentSchedule.rules !== undefined) {
            delete window.currentSchedule.rules;
          }
          if (window.currentSchedule.shiftTimesByLoc !== undefined) {
            delete window.currentSchedule.shiftTimesByLoc;
          }
          window.triggerUnsavedChanges();
          alert("ההגדרות נשמרו כברירת מחדל לכל השבועות הבאים ✓");
        } else {
          // שמירה לשבוע הנוכחי בלבד
          window.currentSchedule.rules = JSON.parse(
            JSON.stringify(window.rules),
          );
          window.currentSchedule.shiftTimesByLoc = JSON.parse(
            JSON.stringify(shiftTimesByLoc),
          );
          window.triggerUnsavedChanges();
          alert(
            "ההגדרות נשמרו לשבוע הנוכחי בלבד ✓\n(לחץ 'שמור שינויים לענן' כדי לאשר)",
          );
        }
      };

      window.renderTrackingPage = function (source) {
        let sortedStaff = [...window.staff]
          .filter((e) => e.isActive !== false)
          .sort(
            (a, b) =>
              window.roleTypes.indexOf(a.type) -
              window.roleTypes.indexOf(b.type),
          );

        let sel1 = document.getElementById("trackingDaySelect");
        let sel2 = document.getElementById("trackingDaySelectFull");
        let selectedDay =
          source === "full" && sel2
            ? sel2.value
            : sel1
              ? sel1.value
              : window.trackingSelectedDay || "ראשון";
        if (sel1) sel1.value = selectedDay;
        if (sel2) sel2.value = selectedDay;
        window.trackingSelectedDay = selectedDay;

        // כל הסטטוסים המיוחדים ליום הנבחר (legacy + גלובלי + משימות)
        const specs = window.getSpecialsForDay
          ? window.getSpecialsForDay(selectedDay, window.currentSchedule)
          : (window.currentSchedule.special && window.currentSchedule.special[selectedDay]) || [];
        const specialEmpIds = new Set(specs.map((s) => String(s.id)));

        // בדיקה אם עובד משובץ לאיזשהי משמרת ביום הנבחר
        const _allPossibleShifts = [...(window.currentShifts || [])];
        if (!_allPossibleShifts.includes("בוקר")) _allPossibleShifts.push("בוקר");
        function _isInAnyShift(emp) {
          return _allPossibleShifts.some((s) =>
            baseLocs.some((l) =>
              window.currentSchedule[`${selectedDay}-${s}`] &&
              window.currentSchedule[`${selectedDay}-${s}`][l] &&
              window.currentSchedule[`${selectedDay}-${s}`][l].find((e) => e.id === emp.id),
            ),
          );
        }

        let html = `<div style="display:flex; flex-wrap:wrap; gap:16px;">`;

        const _muMode = window.currentSchedule && window.currentSchedule.matalUnderstaff === true && !window.isEmergencyMode;

        baseLocs.forEach((loc) => {
          let locName = window.getLocName(loc);
          html += `<div class="card-paper" style="flex:1; min-width:260px; padding:16px; border-top:4px solid var(--md-primary);">`;
          html += `<h3 style="margin:0 0 12px; color:var(--md-primary);">📍 ${locName}</h3>`;

          let anyInLoc = false;
          let shiftsForLoc = (_muMode && loc === LOC_MATAL) ? ["24 שעות"] : window.currentShifts;

          shiftsForLoc.forEach((s) => {
            let peopleInShift = sortedStaff.filter(
              (emp) =>
                !specialEmpIds.has(String(emp.id)) &&
                window.currentSchedule[`${selectedDay}-${s}`] &&
                window.currentSchedule[`${selectedDay}-${s}`][loc] &&
                window.currentSchedule[`${selectedDay}-${s}`][loc].find(
                  (e) => e.id === emp.id,
                ),
            );
            if (peopleInShift.length === 0) return;
            anyInLoc = true;
            html += `<div style="margin-bottom:10px;">`;
            html += `<div style="font-weight:700; color:var(--md-text-secondary); font-size:0.85rem; margin-bottom:4px;">${s} (${peopleInShift.length})</div>`;
            peopleInShift.forEach((emp) => {
              html += `<div style="display:flex; justify-content:space-between; gap:8px; padding:6px 0; border-bottom:1px solid var(--md-divider);">
                <span style="font-weight:600;">👤 ${emp.name}</span>
                <span style="color:var(--md-text-secondary); font-size:0.85rem;">${emp.type}</span>
              </div>`;
            });
            html += `</div>`;
          });

          // נחפפים שיש להם fixedLoc = מיקום זה ולא שובצו לאף משמרת ולא בסטטוס מיוחד
          const nachpafimAtBase = sortedStaff.filter(
            (emp) =>
              emp.type === "נחפף" &&
              (emp.fixedLoc || "") === loc &&
              !specialEmpIds.has(String(emp.id)) &&
              !_isInAnyShift(emp),
          );
          if (nachpafimAtBase.length > 0) {
            anyInLoc = true;
            html += `<div style="margin-bottom:10px;">`;
            html += `<div style="font-weight:700; color:var(--md-text-secondary); font-size:0.85rem; margin-bottom:4px;">בסיס (${nachpafimAtBase.length})</div>`;
            nachpafimAtBase.forEach((emp) => {
              html += `<div style="display:flex; justify-content:space-between; gap:8px; padding:6px 0; border-bottom:1px solid var(--md-divider);">
                <span style="font-weight:600;">👤 ${emp.name}</span>
                <span style="color:var(--md-text-secondary); font-size:0.85rem;">נחפף</span>
              </div>`;
            });
            html += `</div>`;
          }

          // במת"ל ב-24ש: הצג גם עובדים בבוקר שאינם מחזיקי משמרת 24ש (רק בימי חול)
          const _isWeekendDay = ["שישי","שבת"].includes(selectedDay);
          if (loc === LOC_MATAL && _muMode && !_isWeekendDay) {
            const _24hSlot = window.currentSchedule[`${selectedDay}-24 שעות`];
            const _24hIds = new Set(
              (_24hSlot && _24hSlot[LOC_MATAL] ? _24hSlot[LOC_MATAL] : []).map((e) => e.id),
            );
            const bokerSlot = window.currentSchedule[`${selectedDay}-בוקר`];
            const bokerAtMatal = bokerSlot && bokerSlot[LOC_MATAL] ? bokerSlot[LOC_MATAL] : [];
            const presentOnly = sortedStaff.filter(
              (emp) =>
                !specialEmpIds.has(String(emp.id)) &&
                !_24hIds.has(emp.id) &&
                bokerAtMatal.find((e) => e.id === emp.id),
            );
            if (presentOnly.length > 0) {
              anyInLoc = true;
              html += `<div style="margin-bottom:10px;">`;
              html += `<div style="font-weight:700; color:var(--md-text-secondary); font-size:0.85rem; margin-bottom:4px;">בוקר - נוכח (${presentOnly.length})</div>`;
              presentOnly.forEach((emp) => {
                html += `<div style="display:flex; justify-content:space-between; gap:8px; padding:6px 0; border-bottom:1px solid var(--md-divider);">
                  <span style="font-weight:600;">👤 ${emp.name}</span>
                  <span style="color:var(--md-text-secondary); font-size:0.85rem;">${emp.type}</span>
                </div>`;
              });
              html += `</div>`;
            }
          }

          if (!anyInLoc) {
            html += `<div style="color:var(--md-text-secondary); font-style:italic;">אין שיבוצים</div>`;
          }
          html += `</div>`;
        });

        // סטטוסים מיוחדים (כולל טווח תאריכים גלובלי)
        if (specs.length > 0) {
          html += `<div class="card-paper" style="flex:1; min-width:260px; padding:16px; border-top:4px solid var(--md-secondary);">`;
          html += `<h3 style="margin:0 0 12px; color:var(--md-secondary);">🚩 סטטוסים מיוחדים</h3>`;
          specs.forEach((sp) => {
            html += `<div style="display:flex; justify-content:space-between; gap:8px; padding:6px 0; border-bottom:1px solid var(--md-divider);">
              <span style="font-weight:600;">👤 ${sp.name}</span>
              <span style="color:var(--md-secondary); font-weight:600; font-size:0.85rem;">${window.specStatusLabel(sp) || ""}</span>
            </div>`;
          });
          html += `</div>`;
        }

        html += `</div>`;

        let tc = document.getElementById("fullTrackingTableContainer");
        if (tc) tc.innerHTML = html;
        let schedTc = document.querySelector(
          "#page-schedule #trackingTableContainer",
        );
        if (schedTc) schedTc.innerHTML = html;
        let trackTc = document.getElementById("trackingTableContainer");
        if (trackTc) trackTc.innerHTML = html;
      };

      window.renderRequestsPage = function () {
        let html1 = `<h3>⭐ עדיפויות קשיחות ומשמרות מבוקשות</h3><table><tr><th>שם עובד</th><th>יום</th><th>משמרת</th><th>מיקום מבוקש</th><th>פעולה</th></tr>`;
        let count1 = 0;
        window.staff.forEach((emp) => {
          if (emp.prefs) {
            emp.prefs.forEach((p, idx) => {
              count1++;
              let displayLoc = window.getLocName(p.loc);
              html1 += `<tr><td><strong>${emp.name}</strong></td><td>${p.day}</td><td>${p.shift}</td><td><span class="loc-title" style="border:none; margin:0; padding:0;">${displayLoc}</span></td><td><button class="btn btn-error" style="padding:4px 12px;" onclick="window.removePrefFromPage(${emp.id}, ${idx})">מחק</button></td></tr>`;
            });
          }
        });
        if (count1 === 0)
          html1 += `<tr><td colspan="5">אין בקשות משמרת לשבוע הקרוב.</td></tr>`;
        html1 += `</table>`;
        let html2 = `<h3 style="margin-top:30px;">🌴 חופשים ואילוצים</h3><table><tr><th>שם עובד</th><th>יום וזמן</th><th>סטטוס</th><th>פעולה</th></tr>`;
        let count2 = 0;
        window.staff.forEach((emp) => {
          let empConst = emp.constraints || [];
          if (empConst.length > 0) {
            let processedDays = [];
            days.forEach((d) => {
              if (
                empConst.includes(`${d}-בוקר`) &&
                empConst.includes(`${d}-ערב`) &&
                empConst.includes(`${d}-לילה`)
              ) {
                count2++;
                html2 += `<tr><td><strong>${emp.name}</strong></td><td>${d} - יום שלם</td><td><span style="background:rgba(239,68,68,0.1); color:var(--md-error); padding:4px 8px; border-radius:4px; font-weight:500;">🌴 יום חופש מלא</span></td><td><button class="btn btn-error" style="padding:4px 12px;" onclick="window.removeFullDayConstraint(${emp.id}, '${d}')">בטל חופש</button></td></tr>`;
                processedDays.push(`${d}-בוקר`, `${d}-ערב`, `${d}-לילה`);
              }
            });
            empConst.forEach((c) => {
              if (!processedDays.includes(c)) {
                count2++;
                let [d, s] = c.split("-");
                html2 += `<tr><td><strong>${emp.name}</strong></td><td>${d} - ${s}</td><td><span style="background:rgba(245,158,11,0.1); color:var(--md-warning); padding:4px 8px; border-radius:4px; font-weight:500;">אילוץ נקודתי</span></td><td><button class="btn btn-error" style="padding:4px 12px;" onclick="window.removeSingleConstraint(${emp.id}, '${c}')">מחק</button></td></tr>`;
              }
            });
          }
        });
        if (count2 === 0) html2 += `<tr><td colspan="4">אין חופשים.</td></tr>`;
        html2 += `</table>`;
        let reqCont = document.getElementById("requestsTableContainer");
        if (reqCont) reqCont.innerHTML = html1 + html2;
      };

      window.removePrefFromPage = function (empId, prefIdx) {
        let emp = window.staff.find((e) => e.id === empId);
        if (emp && emp.prefs) emp.prefs.splice(prefIdx, 1);
        window.currentSchedule.staff = window.staff;
        window.triggerUnsavedChanges();
        window.renderRequestsPage();
      };

      window.removeSingleConstraint = function (empId, cStr) {
        let emp = window.staff.find((e) => e.id === empId);
        if (emp && emp.constraints)
          emp.constraints = emp.constraints.filter((c) => c !== cStr);
        window.currentSchedule.staff = window.staff;
        window.triggerUnsavedChanges();
        window.renderRequestsPage();
      };

      window.removeFullDayConstraint = function (empId, day) {
        let emp = window.staff.find((e) => e.id === empId);
        if (emp && emp.constraints)
          emp.constraints = emp.constraints.filter(
            (c) =>
              c !== `${day}-בוקר` && c !== `${day}-ערב` && c !== `${day}-לילה`,
          );
        window.currentSchedule.staff = window.staff;
        window.triggerUnsavedChanges();
        window.renderRequestsPage();
      };

      window.clearAllStaffConstraints = function () {
        if (
          confirm(
            'פעולה זו תמחק:\n• כל האילוצים והחופשות\n• כל הבקשות הממתינות לאישור\n• סטטוס סופ"ש (לפני/אחרי) של כלל העובדים\n\n⚠️ שם משתמש, סיסמה והרשאות לא יאופסו.\nהאם להמשיך?',
          )
        ) {
          window.staff.forEach((emp) => {
            // מאפס אך ורק שדות אילוצים ובקשות — לא נוגע בזהות/אבטחה
            emp.constraints = [];
            emp.prefs = [];
            emp.workedLastWeekend = false;
            emp.isNextWeekend = false;
            // שדות שמוגנים: personalId, password, systemRole, name, type, fixedLoc, vacationQuota, isActive, noNights, canManNightAlone, ziraWeekendAllowed, isCommander, commanderPhone
          });
          // מחיקת בקשות ממתינות
          window.currentSchedule.pendingRequests = {};
          window.currentSchedule.staff = window.staff;
          window.triggerUnsavedChanges();
          window.renderStaff();
          if (typeof window.renderPendingRequestsManager === "function")
            window.renderPendingRequestsManager();
          if (typeof window.renderRequestsPage === "function")
            window.renderRequestsPage();
          alert(
            "✅ האילוצים, הבקשות וסטטוס הסופ\"ש אופסו!\nשם משתמש וסיסמה נשמרו ללא שינוי.\nלחץ 'שמור שינויים לענן' כדי לעדכן.",
          );
        }
      };

      window.updateReqDay = function () {
        let d = document.getElementById("reqDate").value;
        if (d) {
          let date = new Date(d);
          document.getElementById("reqDay").value = days[date.getDay()];
        }
      };

      window.toggleReqType = function () {
        let type = document.getElementById("reqType").value;
        document.getElementById("reqShift").style.display =
          type === "vacation" ? "none" : "block";
        document.getElementById("reqLoc").style.display =
          type === "shift" ? "block" : "none";
        let reqNote = document.getElementById("reqNote");
        reqNote.style.display =
          type === "constraint" || type === "vacation" ? "block" : "none";
        if (type === "constraint")
          reqNote.placeholder = "פירוט האילוץ (למשל: רופא שיניים 12:00)...";
        if (type === "vacation")
          reqNote.placeholder = "סיבת החופשה (אופציונלי)...";
      };

      window.populateWorkerRequestNames = function () {
        const selector = document.getElementById("reqEmpSelector");
        if (!selector) return;

        // אם מדובר בעובד מחובר - נועלים את הרשימה רק על השם שלו לתמיד!
        if (
          window.isWorkerMode &&
          window.loggedInUser &&
          window.loggedInUser.id !== "super"
        ) {
          selector.innerHTML = `<option value="${window.loggedInUser.id}">${window.loggedInUser.name}</option>`;
          selector.setAttribute("disabled", "true");
          selector.style.background = "#e2e8f0";
          selector.value = window.loggedInUser.id;
        } else {
          // אם זה מנהל שמגיש עבור מישהו - הרשימה נפתחת רגיל
          selector.innerHTML =
            `<option value="">-- בחר את שמך --</option>` +
            window.staff
              .filter((e) => e.isActive)
              .map((e) => `<option value="${e.id}">${e.name}</option>`)
              .join("");
          selector.removeAttribute("disabled");
          selector.style.background = "white";
        }
      };

      window.submitWorkerRequest = function () {
        const empId = document.getElementById("reqEmpSelector").value;
        const dateVal = document.getElementById("reqDate").value;
        const day = document.getElementById("reqDay").value;
        const type = document.getElementById("reqType").value;
        const shift = document.getElementById("reqShift").value;
        const loc = document.getElementById("reqLoc").value;
        const note = document.getElementById("reqNote").value;
        if (!empId) {
          alert("אנא בחר את שמך מהרשימה!");
          return;
        }
        if (!dateVal || !day) {
          alert("יש לבחור תאריך מהיומן!");
          return;
        }
        const emp = window.staff.find((e) => e.id == empId);
        if (!emp) { alert("שגיאה: עובד לא נמצא."); return; }

        // חישוב מפתח השבוע של הבקשה לפי התאריך שנבחר
        const reqDateObj = new Date(dateVal);
        const reqDayOfWeek = reqDateObj.getDay(); // 0=ראשון
        const reqSunday = new Date(reqDateObj);
        reqSunday.setDate(reqDateObj.getDate() - reqDayOfWeek);
        const targetWeekKey = window.getWeekDbKey(reqSunday);

        // בדיקת מכסה (2 בקשות לשבוע) — רק עבור השבוע הנוכחי המוצג
        let existingCount = 0;
        let locationCount = 0;
        if (targetWeekKey === window.currentSelectedWeek) {
          if (emp.prefs) {
            existingCount += emp.prefs.length;
            locationCount += emp.prefs.filter(
              (p) => p.loc === LOC_ZIRA || p.loc === LOC_MATAL,
            ).length;
          }
          if (emp.constraints) {
            existingCount += Math.ceil(emp.constraints.length / 3);
          }
          if (window.currentSchedule && window.currentSchedule.pendingRequests) {
            Object.values(window.currentSchedule.pendingRequests).forEach((r) => {
              if (r.empId == empId) {
                existingCount++;
                if (r.loc === LOC_ZIRA || r.loc === LOC_MATAL) locationCount++;
              }
            });
          }
          if (existingCount >= 2) {
            alert(`🚨 חסימה: ${emp.name}, הגעת למכסה המקסימלית של 2 בקשות לשבוע זה!`);
            return;
          }
          if (type === "shift" && (loc === LOC_ZIRA || loc === LOC_MATAL) && locationCount >= 1) {
            alert("🚨 חסימה: מותר לבקש מיקום ספציפי פעם אחת בשבוע! הבקשה השנייה חייבת להיות אילוץ/חופש.");
            return;
          }
        }

        const reqId = Date.now();
        const newRequest = {
          id: reqId,
          empId: emp.id,
          empName: emp.name,
          date: dateVal,
          day,
          type,
          shift,
          loc,
          note,
          status: "pending",
        };

        // שמירה לשבוע הנכון לפי התאריך שנבחר
        if (typeof window.saveToCloud === "function") {
          // עדכון מטמון מקומי לתצוגה מיידית (רק לשבוע המוצג)
          if (targetWeekKey === window.currentSelectedWeek) {
            if (!window.currentSchedule.pendingRequests)
              window.currentSchedule.pendingRequests = {};
            window.currentSchedule.pendingRequests[reqId] = newRequest;
          }
          // כתיבה של הבקשה הבודדת לפי מזהה — מאפשר חוק הרשאה מוקשח (עובד מוסיף בלבד)
          window.saveToCloud(
            "schedules/" + targetWeekKey + "/pendingRequests/" + reqId,
            newRequest,
          );
          // אינדקס גלובלי של בקשות ממתינות — מאפשר למנהל לראות בקשות מכל השבועות, בזמן אמת
          window.saveToCloud(
            "pendingRequestsIndex/" + reqId,
            Object.assign({}, newRequest, { weekKey: targetWeekKey, ts: reqId }),
          );
          // מראה אישית לעובד — רשימת בקשות וסטטוס (שורדת גם אחרי טיפול המנהל)
          // כתיבה שקטה: גם אם תיכשל, הבקשה האמיתית כבר נשלחה למנהל
          window.saveToCloud(
            "myRequests/" + emp.id + "/" + reqId,
            {
              id: reqId,
              empId: emp.id,
              date: dateVal,
              day,
              type,
              shift,
              loc,
              note,
              weekKey: targetWeekKey,
              status: "pending",
              ts: reqId,
            },
            { silent: true },
          );

          // הודעת הצלחה + איפוס הטופס
          const fDate = dateVal.split("-").reverse().join(".");
          alert(`✅ הבקשה נשלחה בהצלחה!\n\n📅 תאריך: ${fDate} (${day})\n📋 סוג: ${type === 'vacation' ? 'יום חופש' : type === 'constraint' ? 'אילוץ' : 'בקשת שיבוץ'}\nהמנהל יטפל בבקשתך בהקדם.`);
          document.getElementById("reqDate").value = "";
          document.getElementById("reqDay").value = "";
          document.getElementById("reqNote").value = "";

          setTimeout(() => {
            if (!window.waPromptEnabled) return;
            let sendWa = confirm(
              "האם תרצה גם לשלוח הודעת וואטסאפ למפקד?",
            );
            if (sendWa) {
              let typeStr =
                type === "vacation"
                  ? "יום חופש מלא 🌴"
                  : type === "constraint"
                    ? "אילוץ נקודתי ⏳"
                    : `העדפת משמרת (${window.getLocName(loc)}) 🎯`;
              let shiftStr = type === "vacation" ? "כל היום" : shift;
              let msg = `שלום המפקד 🫡\nהגשתי בקשה חדשה במערכת המשמרות:\n\n*שם:* ${emp.name}\n*תאריך:* ${fDate} (יום ${day})\n*סוג בקשה:* ${typeStr}\n*משמרת:* ${shiftStr}`;
              if (note) msg += `\n*הערה:* ${note}`;
              msg += `\n\n(נשלח אוטומטית דרך מערכת השיבוץ)`;
              window._pendingWAMsg = msg;
              window.showCommanderSelectForWA();
            }
          }, 300);
        }
      };

      // איסוף בקשות ממתינות קיימות (שנשמרו לפני האינדקס) → לאינדקס הגלובלי
      window.backfillPendingIndex = async function () {
        if (!window._fbImports || !window._firebaseDb) return;
        const { ref, get } = window._fbImports;
        for (let off = -2; off <= 10; off++) {
          try {
            const sun = window.getSunday((window.currentWeekOffset || 0) + off);
            const wk = window.getWeekDbKey(sun);
            const snap = await get(
              ref(window._firebaseDb, "schedules/" + wk + "/pendingRequests"),
            );
            if (!snap.exists()) continue;
            const pr = snap.val();
            Object.keys(pr).forEach((id) => {
              if (pr[id] && !(window._allPending && window._allPending[id]))
                window.saveToCloud(
                  "pendingRequestsIndex/" + id,
                  Object.assign({}, pr[id], {
                    weekKey: wk,
                    ts: pr[id].id || Number(id),
                  }),
                );
            });
          } catch (e) {}
        }
      };

      window.renderPendingRequestsManager = function () {
        const queueContainer = document.getElementById("pendingRequestsQueue");
        if (!queueContainer) return;
        // מיזוג: אינדקס גלובלי (כל השבועות) + בקשות השבוע הנוכחי (תאימות לאחור)
        const pending = {};
        const idx = window._allPending || {};
        Object.keys(idx).forEach((id) => {
          if (idx[id]) pending[id] = idx[id];
        });
        const cur =
          window.currentSchedule && window.currentSchedule.pendingRequests
            ? window.currentSchedule.pendingRequests
            : {};
        Object.keys(cur).forEach((id) => {
          if (cur[id] && !pending[id])
            pending[id] = Object.assign({}, cur[id], {
              weekKey: window.currentSelectedWeek,
            });
        });
        const keys = Object.keys(pending).sort((a, b) => {
          // מיון לפי תאריך הבקשה
          const da = pending[a].date || "";
          const db = pending[b].date || "";
          return da.localeCompare(db);
        });

        // זיהוי בקשות חדשות → התראה לאביחי
        if (
          window.lastPendingCount !== null &&
          keys.length > window.lastPendingCount &&
          !window.isWorkerMode &&
          typeof window.fireNewRequestNotif === "function"
        ) {
          // מצא את הבקשה החדשה ביותר (מזהה הגדול ביותר)
          const newestId = keys.reduce(
            (a, b) => (Number(b) > Number(a) ? b : a),
            keys[0],
          );
          if (newestId && pending[newestId]) {
            window.fireNewRequestNotif(pending[newestId]);
          }
        }
        window.lastPendingCount = keys.length;

        if (keys.length === 0) {
          queueContainer.innerHTML = `<span style="color:#64748b; font-style:italic;">אין בקשות הממתינות לאישורך כרגע.</span>`;
          return;
        }
        let html = `<table style="width:100%; text-align:right;"><tr><th>עובד</th><th>תאריך / יום</th><th>משמרת</th><th>סוג הבקשה</th><th>פעולות</th></tr>`;
        keys.forEach((id) => {
          const r = pending[id];
          let fDate = r.date ? r.date.split("-").reverse().join(".") : "כללי";
          let typeStr = "";
          if (r.type === "vacation")
            typeStr = `🌴 חופש מלא<br><small>${r.note || ""}</small>`;
          else if (r.type === "constraint")
            typeStr = `⏳ אילוץ: <b>${r.note}</b>`;
          else typeStr = `📍 העדפת שיבוץ (${window.getLocName(r.loc)})`;
          let shiftStr = r.type === "vacation" ? "-" : r.shift;
          html += `<tr style="border-bottom: 1px solid var(--md-divider);"><td><b>${r.empName}</b></td><td>${fDate}<br><small>${r.day}</small></td><td>${shiftStr}</td><td>${typeStr}</td><td><button class="btn btn-contained" style="background:#16a34a; padding:4px 12px; margin-left:6px;" onclick="window.processRequest('${id}', true)">✅ אישור</button><button class="btn btn-error" style="padding:4px 12px;" onclick="window.processRequest('${id}', false)">❌ דחייה</button></td></tr>`;
        });
        html += `</table>`;
        queueContainer.innerHTML = html;
      };

      // החלת אישור בקשה על אובייקט לוח (constraint/pref) — משותף לשבוע נוכחי ועתידי
      window._applyRequestToSchedule = function (sched, r) {
        if (!sched.staff) sched.staff = [];
        let emp = sched.staff.find((e) => e.id == r.empId);
        if (!emp) {
          // העובד טרם קיים בעותק השבועי — מוסיפים מהמאגר
          const g = (window.globalStaff || []).find((e) => e.id == r.empId);
          if (g) {
            emp = JSON.parse(JSON.stringify(g));
            emp.constraints = emp.constraints || [];
            emp.prefs = emp.prefs || [];
            sched.staff.push(emp);
          }
        }
        if (!emp) return;
        emp.constraints = emp.constraints || [];
        emp.prefs = emp.prefs || [];
        if (r.type === "vacation")
          emp.constraints.push(`${r.day}-בוקר`, `${r.day}-ערב`, `${r.day}-לילה`);
        else if (r.type === "constraint")
          emp.constraints.push(`${r.day}-${r.shift}`);
        else if (r.type === "shift")
          emp.prefs.push({ day: r.day, shift: r.shift, loc: r.loc });
      };

      window.processRequest = async function (reqId, isApproved) {
        // מקור הבקשה: אינדקס גלובלי (כל השבועות) או השבוע הנוכחי
        const r =
          (window._allPending && window._allPending[reqId]) ||
          (window.currentSchedule.pendingRequests &&
            window.currentSchedule.pendingRequests[reqId]);
        if (!r) {
          alert("הבקשה לא נמצאה (ייתכן שכבר טופלה).");
          return;
        }
        const weekKey = r.weekKey || window.currentSelectedWeek;
        const fb = window._fbImports;

        if (weekKey === window.currentSelectedWeek) {
          // שבוע מוצג — עדכון מקומי ושמירה כרגיל
          if (isApproved)
            window._applyRequestToSchedule(
              { staff: window.staff },
              r,
            );
          if (
            window.currentSchedule.pendingRequests &&
            window.currentSchedule.pendingRequests[reqId]
          )
            delete window.currentSchedule.pendingRequests[reqId];
          window.currentSchedule.staff = window.staff;
          window.saveToCloud(
            "schedules/" + window.currentSelectedWeek,
            window.currentSchedule,
          );
        } else if (fb && window._firebaseDb) {
          // שבוע אחר — קריאה, עדכון וכתיבה ישירה לאותו שבוע (בלי לשנות את התצוגה)
          try {
            const snap = await fb.get(
              fb.ref(window._firebaseDb, "schedules/" + weekKey),
            );
            const sched = snap.exists()
              ? snap.val()
              : { isPublished: false, special: {}, dailyNotes: {} };
            if (isApproved) window._applyRequestToSchedule(sched, r);
            if (sched.pendingRequests) delete sched.pendingRequests[reqId];
            window.saveToCloud("schedules/" + weekKey, sched);
          } catch (e) {
            alert("שגיאה בטיפול בבקשה: " + (e.message || e));
            return;
          }
        }

        // הסרה מהאינדקס הגלובלי
        if (fb && window._firebaseDb)
          fb.remove(fb.ref(window._firebaseDb, "pendingRequestsIndex/" + reqId));

        // עדכון הסטטוס במראה האישית של העובד → מפעיל התראה אצלו
        if (r.empId != null) {
          window.saveToCloud(
            "myRequests/" + r.empId + "/" + reqId + "/status",
            isApproved ? "approved" : "rejected",
          );
          window.saveToCloud(
            "myRequests/" + r.empId + "/" + reqId + "/statusTs",
            Date.now(),
          );
        }
        alert(
          isApproved
            ? "✅ הבקשה אושרה והוזנה אוטומטית לתיק העובד!"
            : "❌ הבקשה נדחתה ונמחקה מהתור.",
        );
        if (typeof window.renderPendingRequestsManager === "function")
          window.renderPendingRequestsManager();
        if (typeof window.renderRequestsPage === "function")
          window.renderRequestsPage();
        if (weekKey === window.currentSelectedWeek)
          window.triggerUnsavedChanges();
      };

      window.addPrefRow = function (day = "", shift = "", loc = "") {
        const div = document.createElement("div");
        div.className = "pref-row";
        div.style.display = "flex";
        div.style.gap = "8px";
        div.style.marginBottom = "8px";
        let dayOpts =
          `<option value="">יום</option>` +
          days
            .map(
              (d) =>
                `<option value="${d}" ${day === d ? "selected" : ""}>${d}</option>`,
            )
            .join("");
        let shiftOpts =
          `<option value="">משמרת</option>` +
          normalShifts
            .map(
              (s) =>
                `<option value="${s}" ${shift === s ? "selected" : ""}>${s}</option>`,
            )
            .join("");
        let locOpts =
          `<option value="">מקום</option>` +
          baseLocs
            .map(
              (l) =>
                `<option value="${l}" ${loc === l ? "selected" : ""}>${window.getLocName(l)}</option>`,
            )
            .join("");
        div.innerHTML = `<select class="pDay" style="flex:1;">${dayOpts}</select><select class="pShift" style="flex:1;">${shiftOpts}</select><select class="pLoc" style="flex:1; color:var(--accent); font-weight:500;">${locOpts}</select><button class="btn btn-error" style="padding:0 12px; min-width:auto;" onclick="this.parentElement.remove()">×</button>`;
        document.getElementById("prefsContainer").appendChild(div);
      };

      window.toggleRoleSpecificUI = function () {
        const type = document.getElementById("editType").value;
        document.getElementById("lblManagerBAlone").style.display =
          type === "קבע" ? "block" : "none";
        document.getElementById("lblZiraWeekend").style.display =
          type === "נחפף" ? "block" : "none";
        document.getElementById("lblZiraEvening").style.display =
          type === "טכנאי" ? "block" : "none";
        const commanderRoles = ["קבינט בכיר", "קבע", "מילואים"];
        document.getElementById("commanderSection").style.display =
          commanderRoles.includes(type) ? "block" : "none";
        const isActiveRow = document.getElementById("isActiveRow");
        if (isActiveRow)
          isActiveRow.style.display = type === "קבינט בכיר" ? "none" : "inline-block";
      };

      window.openModal = function (id) {
        window.currentId = id;
        const emp = window.staff.find((e) => e.id === id);
        document.getElementById("editName").value = emp.name;
        document.getElementById("editType").innerHTML = window.roleTypes
          .map(
            (rt) =>
              `<option value="${rt}" ${emp.type === rt ? "selected" : ""}>${rt}</option>`,
          )
          .join("");
        document.getElementById("editFixedLoc").value = emp.fixedLoc || "";
        const _oMQuota = emp.vacationQuota !== undefined ? emp.vacationQuota : 14;
        document.getElementById("editVacation").value = _oMQuota;
        // חישוב יתרה: נוצלו (אילוצים + סטטוסים מיוחדים)
        const _oMConstraints = emp.constraints || [];
        let _oMUsed = 0;
        days.forEach(d => {
          if (_oMConstraints.includes(`${d}-בוקר`) && _oMConstraints.includes(`${d}-ערב`) && _oMConstraints.includes(`${d}-לילה`)) _oMUsed++;
        });
        (window.specialStatuses || []).filter(s => String(s.empId) === String(emp.id) && ["חופש","חופשה","מחלה"].some(v => (s.status||"").includes(v))).forEach(s => {
          if (s.startDate && s.endDate) _oMUsed += Math.ceil((new Date(s.endDate) - new Date(s.startDate)) / 86400000) + 1;
        });
        const _oMRemaining = _oMQuota - _oMUsed;
        const _balEl = document.getElementById("editVacationBalance");
        if (_balEl) _balEl.innerHTML = `נוצלו: <b>${_oMUsed}</b> | נשארו: <b style="color:${_oMRemaining < 0 ? 'var(--md-error)' : 'var(--md-success)'}">${_oMRemaining}</b>`;

        // שדות מנהל על
        document.getElementById("editPersonalId").value = emp.personalId || "";
        document.getElementById("editPassword").value = emp.password || "1234";

        // נעילת תפקיד "מנהל ראשי" רק לאביחי
        let sysRoleSelect = document.getElementById("editSystemRole");
        if (emp.personalId === "8326560") {
          sysRoleSelect.innerHTML = `<option value="superAdmin">מנהל ראשי (מערכת)</option>`;
          emp.systemRole = "superAdmin";
        } else {
          sysRoleSelect.innerHTML = `<option value="worker">עובד (צפייה ובקשות)</option><option value="subManager">מנהל משני (עריכת סידור)</option>`;
          if (emp.systemRole === "superAdmin") emp.systemRole = "subManager"; // למקרה שמישהו הוגדר בטעות
        }
        sysRoleSelect.value = emp.systemRole || "worker";

        // זמינות משמרות — ברירת מחדל: עושה הכל. noNights הישן = לא עושה לילה
        document.getElementById("editCanMorning").checked =
          emp.canMorning !== false;
        document.getElementById("editCanEvening").checked =
          emp.canEvening !== false;
        document.getElementById("editCanNight").checked =
          emp.canNight !== false && emp.noNights !== true;
        if (emp.isNextWeekend)
          document.getElementById("editNextWeekend").checked = true;
        else if (emp.workedLastWeekend)
          document.getElementById("editWorkedSat").checked = true;
        else document.getElementById("editNoneWeekend").checked = true;
        document.getElementById("editIsActive").checked =
          emp.isActive !== false;
        document.getElementById("editManagerBAlone").checked =
          emp.canManNightAlone !== false;
        document.getElementById("editZiraWeekend").checked =
          emp.ziraWeekendAllowed || false;
        document.getElementById("editZiraEvening").checked =
          emp.canZiraEvening || false;
        // בדיקה אם העובד כבר ברשימת המפקדים (גם ללא empId — לפי שם)
        let linkedCmd = window.commanders.find(
          (c) => c.empId === emp.id || c.name === emp.name,
        );
        let isCmd = emp.isCommander || !!linkedCmd;
        let cmdPhone = emp.commanderPhone || (linkedCmd ? linkedCmd.phone : "");
        // עדכון empId אם חסר
        if (linkedCmd && !linkedCmd.empId) {
          linkedCmd.empId = emp.id;
          localStorage.setItem(
            "shift_commanders_v1",
            JSON.stringify(window.commanders),
          );
        }
        document.getElementById("editIsCommander").checked = isCmd;
        document.getElementById("editCommanderPhone").value = cmdPhone;
        document.getElementById("commanderPhoneWrapper").style.display = isCmd
          ? "block"
          : "none";
        window.toggleRoleSpecificUI();

        document.getElementById("prefsContainer").innerHTML = "";
        if (emp.prefs)
          emp.prefs.forEach((p) => window.addPrefRow(p.day, p.shift, p.loc));
        let conHtml = "";
        let empConst = emp.constraints || [];
        days.forEach((d) => {
          let mChecked = empConst.includes(d + "-בוקר") ? "checked" : "";
          let eChecked = empConst.includes(d + "-ערב") ? "checked" : "";
          let nChecked = empConst.includes(d + "-לילה") ? "checked" : "";
          let fullChecked = mChecked && eChecked && nChecked ? "checked" : "";
          conHtml += `<div style="display:flex; align-items:center; background:var(--bg); padding:10px 16px; border-radius:4px; gap:15px; border:1px solid var(--border-color);"><strong style="width:50px; color:var(--md-primary);">${d}</strong><label style="cursor:pointer; font-size:0.875rem;"><input type="checkbox" style="accent-color:var(--accent);" id="con_${d}_בוקר" ${mChecked} onchange="window.toggleConUI(${id}, '${d}', 'בוקר')"> בוקר</label><label style="cursor:pointer; font-size:0.875rem;"><input type="checkbox" style="accent-color:var(--accent);" id="con_${d}_ערב" ${eChecked} onchange="window.toggleConUI(${id}, '${d}', 'ערב')"> ערב</label><label style="cursor:pointer; font-size:0.875rem;"><input type="checkbox" style="accent-color:var(--accent);" id="con_${d}_לילה" ${nChecked} onchange="window.toggleConUI(${id}, '${d}', 'לילה')"> לילה</label><div style="flex-grow:1;"></div><label style="font-weight:500; color:var(--md-error); background:rgba(239,68,68,0.1); padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.875rem;"><input type="checkbox" style="accent-color:var(--md-error);" id="con_${d}_full" ${fullChecked} onchange="window.toggleFullDay(${id}, '${d}')"> 🌴 חופש</label></div>`;
        });
        document.getElementById("constraintsGrid").innerHTML = conHtml;
        document.getElementById("editModal").style.display = "flex";
      };

      window.toggleConUI = function (id, day, shift) {
        const emp = window.staff.find((e) => e.id === id);
        emp.constraints = emp.constraints || [];
        const k = `${day}-${shift}`;
        if (emp.constraints.includes(k))
          emp.constraints = emp.constraints.filter((x) => x !== k);
        else emp.constraints.push(k);
        const hasM = emp.constraints.includes(`${day}-בוקר`);
        const hasE = emp.constraints.includes(`${day}-ערב`);
        const hasN = emp.constraints.includes(`${day}-לילה`);
        document.getElementById(`con_${day}_full`).checked =
          hasM && hasE && hasN;
      };

      window.toggleFullDay = function (id, day) {
        const emp = window.staff.find((e) => e.id === id);
        emp.constraints = emp.constraints || [];
        const isFull = document.getElementById(`con_${day}_full`).checked;
        const m = `${day}-בוקר`;
        const e = `${day}-ערב`;
        const n = `${day}-לילה`;
        if (isFull) {
          if (!emp.constraints.includes(m)) emp.constraints.push(m);
          if (!emp.constraints.includes(e)) emp.constraints.push(e);
          if (!emp.constraints.includes(n)) emp.constraints.push(n);
        } else {
          emp.constraints = emp.constraints.filter(
            (x) => x !== m && x !== e && x !== n,
          );
        }
        document.getElementById(`con_${day}_בוקר`).checked = isFull;
        document.getElementById(`con_${day}_ערב`).checked = isFull;
        document.getElementById(`con_${day}_לילה`).checked = isFull;
      };

      window.closeModal = function () {
        const emp = window.staff.find((e) => e.id === window.currentId);

        // הגנה נוספת: מניעת שיוך המספר האישי של המנהל הראשי לעובד אחר
        if (window.currentUserRole === "superAdmin") {
          let newPid = document.getElementById("editPersonalId").value.trim();
          if (newPid === "8326560" && emp.personalId !== "8326560") {
            alert(
              "שגיאה אבטחה: לא ניתן לשייך מספר אישי זה לעובד אחר. הוא שמור למנהל המערכת הראשי.",
            );
            return; // עוצר את השמירה ולא סוגר את החלון
          }
        }

        emp.name = document.getElementById("editName").value;
        emp.type = document.getElementById("editType").value;
        emp.fixedLoc = document.getElementById("editFixedLoc").value;
        emp.vacationQuota =
          parseInt(document.getElementById("editVacation").value) || 0;
        // זמינות משמרות
        emp.canMorning = document.getElementById("editCanMorning").checked;
        emp.canEvening = document.getElementById("editCanEvening").checked;
        emp.canNight = document.getElementById("editCanNight").checked;
        // תאימות לאחור: noNights הישן נגזר מ-canNight (משמש בבדיקות לילה קיימות)
        emp.noNights = !emp.canNight;
        emp.canManNightAlone =
          document.getElementById("editManagerBAlone").checked;
        emp.ziraWeekendAllowed =
          document.getElementById("editZiraWeekend").checked;
        emp.canZiraEvening =
          document.getElementById("editZiraEvening").checked;

        const commanderRoles = ["קבינט בכיר", "קבע", "מילואים"];
        if (commanderRoles.includes(emp.type)) {
          emp.isCommander = document.getElementById("editIsCommander").checked;
          emp.commanderPhone = document
            .getElementById("editCommanderPhone")
            .value.trim() || "";
          if (emp.isCommander && emp.commanderPhone) {
            let idx = window.commanders.findIndex((c) => c.empId === emp.id);
            if (idx >= 0) {
              window.commanders[idx].name = emp.name;
              window.commanders[idx].phone = emp.commanderPhone;
            } else {
              window.commanders.push({
                id: Date.now(),
                empId: emp.id,
                name: emp.name,
                phone: emp.commanderPhone,
              });
            }
          } else {
            window.commanders = window.commanders.filter(
              (c) => c.empId !== emp.id,
            );
          }
          localStorage.setItem(
            "shift_commanders_v1",
            JSON.stringify(window.commanders),
          );
        } else {
          // תפקיד שאינו מפקד — ודא שהשדות לא undefined
          emp.isCommander = false;
          emp.commanderPhone = emp.commanderPhone || "";
        }

        // שמירת הרשאות רק אם מנהל על עורך
        if (window.currentUserRole === "superAdmin") {
          emp.personalId = document
            .getElementById("editPersonalId")
            .value.trim();
          emp.password = document.getElementById("editPassword").value.trim();
          emp.systemRole = document.getElementById("editSystemRole").value;
        }

        if (document.getElementById("editNextWeekend").checked) {
          emp.isNextWeekend = true;
          emp.workedLastWeekend = false;
        } else if (document.getElementById("editWorkedSat").checked) {
          emp.isNextWeekend = false;
          emp.workedLastWeekend = true;
        } else {
          emp.isNextWeekend = false;
          emp.workedLastWeekend = false;
        }
        emp.isActive = document.getElementById("editIsActive").checked;
        const prefRows = document.querySelectorAll(".pref-row");
        emp.prefs = Array.from(prefRows)
          .map((row) => ({
            day: row.querySelector(".pDay").value,
            shift: row.querySelector(".pShift").value,
            loc: row.querySelector(".pLoc").value,
          }))
          .filter((p) => p.day && p.shift && p.loc);
        window.currentSchedule.staff = window.staff;
        document.getElementById("editModal").style.display = "none";
        window.triggerUnsavedChanges();
        window.renderStaff();

        let globalEmp = window.globalStaff.find((e) => e.id === emp.id);
        if (globalEmp) {
          globalEmp.name = emp.name;
          globalEmp.type = emp.type;
          globalEmp.fixedLoc = emp.fixedLoc;
          globalEmp.vacationQuota = emp.vacationQuota;
          globalEmp.noNights = emp.noNights;
          globalEmp.canMorning = emp.canMorning;
          globalEmp.canEvening = emp.canEvening;
          globalEmp.canNight = emp.canNight;
          globalEmp.canManNightAlone = emp.canManNightAlone;
          globalEmp.ziraWeekendAllowed = emp.ziraWeekendAllowed;
          globalEmp.canZiraEvening = emp.canZiraEvening;
          globalEmp.isCommander = emp.isCommander === true;
          globalEmp.commanderPhone = emp.commanderPhone || "";
          if (window.currentUserRole === "superAdmin") {
            globalEmp.personalId = emp.personalId;
            globalEmp.password = emp.password;
            globalEmp.systemRole = emp.systemRole;
          }
          if (typeof window.saveToCloud === "function")
            window.saveToCloud("staffMaster", window.globalStaff);
        }
      };

      window.addNewEmployee = function () {
        let pId = prompt(
          "הכנס מספר אישי לעובד החדש (זה יהיה שם המשתמש שלו להתחברות):",
        );
        if (!pId) return;
        const name = prompt("שם מלא:");
        if (name) {
          let newEmp = {
            id: Date.now(),
            personalId: pId.trim(),
            password: "1234",
            systemRole: "worker",
            name,
            type: "טכנאי",
            fixedLoc: "",
            isActive: true,
            noNights: false,
            canMorning: true,
            canEvening: true,
            canNight: true,
            canManNightAlone: true,
            ziraWeekendAllowed: false,
            canZiraEvening: false,
            vacationQuota: 14,
            workedLastWeekend: false,
            isNextWeekend: false,
            isCommander: false,
            commanderPhone: "",
            constraints: [],
            prefs: [],
            specialStatuses: [],
            currentWeekly: 0,
            nightsThisWeek: 0,
          };
          window.staff.push(newEmp);
          window.globalStaff.push(newEmp);
          window.currentSchedule.staff = window.staff;
          window.triggerUnsavedChanges();
          window.renderStaff();
          if (typeof window.saveToCloud === "function")
            window.saveToCloud("staffMaster", window.globalStaff);
        }
      };

      window.deleteEmployee = function () {
        if (confirm("בטוח למחוק? המחיקה תתבצע גם משבועות עתידיים.")) {
          window.staff = window.staff.filter((e) => e.id !== window.currentId);
          window.globalStaff = window.globalStaff.filter(
            (e) => e.id !== window.currentId,
          );
          window.currentSchedule.staff = window.staff;
          document.getElementById("editModal").style.display = "none";
          window.triggerUnsavedChanges();
          window.renderStaff();
          if (typeof window.saveToCloud === "function")
            window.saveToCloud("staffMaster", window.globalStaff);
        }
      };

      window.generate = function (keepExisting = false) {
        let dayLog = {};
        days.forEach((d) => (dayLog[d] = []));

        if (!keepExisting) {
          let oldSched = window.currentSchedule;
          let pub = oldSched.isPublished;
          window.currentSchedule = {
            isPublished: pub,
            special: oldSched.special || {},
            dailyNotes: oldSched.dailyNotes || {},
            staff: window.staff,
            matalUnderstaff: oldSched.matalUnderstaff || false,
            isEmergencyMode: oldSched.isEmergencyMode || false,
            emergencyStartDate: oldSched.emergencyStartDate || null,
            emergencyEndDate: oldSched.emergencyEndDate || null,
            emergencyShiftHours: oldSched.emergencyShiftHours || 24,
            matalUnderstaffStartDate: oldSched.matalUnderstaffStartDate || null,
            matalUnderstaffEndDate: oldSched.matalUnderstaffEndDate || null,
            dayHighlights: oldSched.dayHighlights || {},
          };
          window.currentNotesLog = {};
          window.initSchedule();

          const _oldShiftLocks = oldSched.shiftLocks || {};
          window.currentSchedule.shiftLocks = JSON.parse(JSON.stringify(_oldShiftLocks));
          days.forEach((d) => {
            window.currentShifts.forEach((s) => {
              baseLocs.forEach((loc) => {
                if (oldSched[`${d}-${s}`] && oldSched[`${d}-${s}`][loc]) {
                  const shiftKey = `${d}-${s}-${loc}`;
                  if (_oldShiftLocks[shiftKey]) {
                    // נעילת משמרת שלמה — שמור את כל העובדים
                    window.currentSchedule[`${d}-${s}`][loc] = [...oldSched[`${d}-${s}`][loc]];
                  } else {
                    let lockedEmps = oldSched[`${d}-${s}`][loc].filter((e) => e.isLocked);
                    if (lockedEmps.length > 0) {
                      window.currentSchedule[`${d}-${s}`][loc] = lockedEmps;
                    }
                  }
                }
              });
            });
            // שמירת עובדים נעולים ב-24 שעות מת"ל (מצב חוסר)
            if (oldSched.matalUnderstaff === true && oldSched[`${d}-24 שעות`] && oldSched[`${d}-24 שעות`][LOC_MATAL]) {
              const shiftKey24 = `${d}-24 שעות-${LOC_MATAL}`;
              if (_oldShiftLocks[shiftKey24]) {
                window.currentSchedule[`${d}-24 שעות`][LOC_MATAL] = [...oldSched[`${d}-24 שעות`][LOC_MATAL]];
              } else {
                let lockedEmps24 = oldSched[`${d}-24 שעות`][LOC_MATAL].filter((e) => e.isLocked);
                if (lockedEmps24.length > 0)
                  window.currentSchedule[`${d}-24 שעות`][LOC_MATAL] = lockedEmps24;
              }
            }
          });
        }

        const _isMU = window.currentSchedule && window.currentSchedule.matalUnderstaff === true && !window.isEmergencyMode;

        days.forEach((d) => {
          window.currentShifts.forEach((s) => {
            baseLocs.forEach((loc) => {
              if (
                window.currentSchedule[`${d}-${s}`] &&
                window.currentSchedule[`${d}-${s}`][loc]
              ) {
                window.currentSchedule[`${d}-${s}`][loc].forEach((emp) => {
                  if (!dayLog[d].includes(emp.id)) dayLog[d].push(emp.id);
                });
              }
            });
          });
          // במצב חוסר מת"ל — גם עובדי 24ש מת"ל נכנסים ל-dayLog
          if (_isMU && window.currentSchedule[`${d}-24 שעות`] && window.currentSchedule[`${d}-24 שעות`][LOC_MATAL]) {
            window.currentSchedule[`${d}-24 שעות`][LOC_MATAL].forEach((emp) => {
              if (!dayLog[d].includes(emp.id)) dayLog[d].push(emp.id);
            });
          }
        });

        let activeStaff = window.staff.filter((e) => e.isActive !== false);
        activeStaff.forEach((e) => (e.shiftCount = 0));

        days.forEach((d) => {
          window.currentShifts.forEach((s) => {
            baseLocs.forEach((loc) => {
              if (
                window.currentSchedule[`${d}-${s}`] &&
                window.currentSchedule[`${d}-${s}`][loc]
              ) {
                window.currentSchedule[`${d}-${s}`][loc].forEach((emp) => {
                  let actEmp = activeStaff.find((x) => x.id === emp.id);
                  if (actEmp) actEmp.shiftCount++;
                });
              }
            });
          });
          // במצב חוסר מת"ל — ספירת משמרות 24ש מת"ל
          if (_isMU && window.currentSchedule[`${d}-24 שעות`] && window.currentSchedule[`${d}-24 שעות`][LOC_MATAL]) {
            window.currentSchedule[`${d}-24 שעות`][LOC_MATAL].forEach((emp) => {
              let actEmp = activeStaff.find((x) => x.id === emp.id);
              if (actEmp) actEmp.shiftCount++;
            });
          }
        });

        days.forEach((day) => {
          if (
            window.currentSchedule.special &&
            window.currentSchedule.special[day]
          ) {
            window.currentSchedule.special[day].forEach((sp) => {
              dayLog[day].push(sp.id);
            });
          }
          window.currentShifts.forEach((shift) => {
            baseLocs.forEach((loc) => {
              if (window.isShiftLocked(day, shift, loc)) return; // דלג על משמרות נעולות
              activeStaff.forEach((emp) => {
                if (
                  emp.prefs &&
                  emp.prefs.find(
                    (p) => p.day === day && p.shift === shift && p.loc === loc,
                  ) &&
                  !dayLog[day].includes(emp.id)
                ) {
                  if (
                    !window.currentSchedule[`${day}-${shift}`][loc].find(
                      (x) => x.id === emp.id,
                    )
                  ) {
                    window.currentSchedule[`${day}-${shift}`][loc].push({
                      ...emp,
                      isPref: true,
                    });
                    emp.shiftCount++;
                    if (!dayLog[day].includes(emp.id)) dayLog[day].push(emp.id);
                  }
                }
              });
            });
          });
        });

        if (window.isEmergencyMode) {
          let manAs = activeStaff.filter((e) => e.type === "קבינט בכיר");
          // חישוב נקודת התחלה של הסבב לפי תאריך תחילת חירום
          const _emStartStr = window.currentSchedule.emergencyStartDate;
          const _emStartDate = _emStartStr ? new Date(_emStartStr) : null;
          const _emWeekSun = window.getSunday(window.currentWeekOffset || 0);
          const _emShiftHours = window.currentSchedule.emergencyShiftHours || 24;
          const _emShiftDays = Math.max(1, Math.round(_emShiftHours / 24));
          days.forEach((day, dIdx) => {
            let tIdx;
            if (_emStartDate) {
              const dayDate = new Date(_emWeekSun);
              dayDate.setDate(dayDate.getDate() + dIdx);
              const daysSinceStart = Math.max(0, Math.floor((dayDate - _emStartDate) / 86400000));
              tIdx = Math.floor(daysSinceStart / _emShiftDays) % 3;
            } else {
              tIdx = Math.floor(dIdx / _emShiftDays) % 3;
            }
            let shift = "24 שעות";
            let todayZiraFull = window.emRotations.zira[tIdx].full
              .map((name) => activeStaff.find((s) => s.name === name))
              .filter(Boolean);
            let todayZiraPart = window.emRotations.zira[tIdx].part
              .map((name) => activeStaff.find((s) => s.name === name))
              .filter(Boolean);
            let today200Man = activeStaff.find(
              (s) => s.name === window.emRotations.m200[tIdx].manager,
            );
            let today200Workers = window.emRotations.m200[tIdx].workers
              .map((name) => activeStaff.find((s) => s.name === name))
              .filter(Boolean);
            let zDest = window.currentSchedule[`${day}-${shift}`][LOC_ZIRA];
            todayZiraFull.forEach((emp) => {
              if (
                !zDest.find((e) => e.id === emp.id) &&
                !dayLog[day].includes(emp.id)
              ) {
                zDest.push({ ...emp, auto: true });
                dayLog[day].push(emp.id);
              }
            });
            todayZiraPart.forEach((emp) => {
              if (
                !zDest.find((e) => e.id === emp.id) &&
                !dayLog[day].includes(emp.id)
              ) {
                zDest.push({ ...emp, auto: true, note: "עד הערב" });
                dayLog[day].push(emp.id);
              }
            });
            let mDest = window.currentSchedule[`${day}-${shift}`][LOC_MATAL];
            manAs.forEach((emp) => {
              if (
                !mDest.find((e) => e.id === emp.id) &&
                !dayLog[day].includes(emp.id)
              ) {
                mDest.push({ ...emp, auto: true });
                dayLog[day].push(emp.id);
              }
            });
            if (
              today200Man &&
              !mDest.find((e) => e.id === today200Man.id) &&
              !dayLog[day].includes(today200Man.id)
            ) {
              mDest.push({ ...today200Man, auto: true });
              dayLog[day].push(today200Man.id);
            }
            today200Workers.forEach((emp) => {
              if (
                !mDest.find((e) => e.id === emp.id) &&
                !dayLog[day].includes(emp.id)
              ) {
                mDest.push({ ...emp, auto: true });
                dayLog[day].push(emp.id);
              }
            });
          });
          // נחפפים — שיבוץ לפי fixedLoc ב-24ש בחירום (יום כן / יום לא)
          activeStaff.filter(e => e.type === "נחפף").forEach(emp => {
            const destLoc = emp.fixedLoc || LOC_MATAL;
            days.forEach((day, dIdx) => {
              if (dayLog[day].includes(emp.id)) return;
              if (window.currentSchedule.special && window.currentSchedule.special[day] &&
                  window.currentSchedule.special[day].some(x => x.id === emp.id)) return;
              const slot24 = window.currentSchedule[`${day}-24 שעות`];
              if (!slot24 || !slot24[destLoc]) return;
              if (slot24[destLoc].find(x => x.id === emp.id)) return;
              if (dIdx > 0) {
                const prevDay = days[dIdx - 1];
                const prev24 = window.currentSchedule[`${prevDay}-24 שעות`];
                const workedPrev24 = prev24 && (
                  (prev24[LOC_MATAL] || []).find(x => x.id === emp.id) ||
                  (prev24[LOC_ZIRA] || []).find(x => x.id === emp.id)
                );
                if (workedPrev24) return;
              }
              slot24[destLoc].push({ ...emp, auto: true });
              dayLog[day].push(emp.id);
              emp.shiftCount++;
            });
          });
        } else {
          let weekendStaff = { [LOC_MATAL]: [], [LOC_ZIRA]: [] };
          let shuffledStaff = activeStaff
            .slice()
            .sort(() => Math.random() - 0.5);

          const isAvailableForWeekend = (e, loc) => {
            if (e.type === "קבינט בכיר") return false;
            const wShifts =
              loc === LOC_MATAL ? weekendShiftsMATAL : weekendShiftsZira;
            let empConst = e.constraints || [];
            const hasWeekendConstraint = wShifts.some((sk) =>
              empConst.includes(sk),
            );
            const hasSundaySpillover = empConst.includes("ראשון-בוקר");
            let hasAnyWeekendPref = false;
            if (e.prefs)
              hasAnyWeekendPref = e.prefs.some(
                (p) =>
                  (p.day === "שישי" ||
                    p.day === "שבת" ||
                    (p.day === "חמישי" &&
                      p.shift === "לילה" &&
                      loc === LOC_MATAL)) &&
                  p.loc === loc,
              );
            if (
              e.type === "נחפף" &&
              loc === LOC_ZIRA &&
              !e.ziraWeekendAllowed &&
              !hasAnyWeekendPref
            )
              return false;
            let isCorrectFixedLoc =
              e.fixedLoc === "" ||
              e.fixedLoc === loc ||
              hasAnyWeekendPref ||
              (e.type === "נחפף" && loc === LOC_ZIRA && e.ziraWeekendAllowed);
            if (!e.isNextWeekend && !hasAnyWeekendPref) return false;
            return (
              !hasWeekendConstraint &&
              !hasSundaySpillover &&
              !e.workedLastWeekend &&
              !e.noNights &&
              isCorrectFixedLoc
            );
          };

          baseLocs.forEach((loc) => {
            const rule = window.rules[loc]["weekend"];
            if (rule) {
              if (keepExisting) {
                let wShifts =
                  loc === LOC_MATAL ? weekendShiftsMATAL : weekendShiftsZira;
                wShifts.forEach((sk) => {
                  if (
                    window.currentSchedule[sk] &&
                    window.currentSchedule[sk][loc]
                  ) {
                    window.currentSchedule[sk][loc].forEach((e) => {
                      if (!weekendStaff[loc].find((x) => x.id === e.id))
                        weekendStaff[loc].push(e);
                    });
                  }
                });
              }
              let candidates = shuffledStaff
                .filter(
                  (e) =>
                    rule.roles.includes(e.type) &&
                    isAvailableForWeekend(e, loc) &&
                    !weekendStaff[LOC_MATAL].find((x) => x.id === e.id) &&
                    !weekendStaff[LOC_ZIRA].find((x) => x.id === e.id),
                )
                .sort((a, b) => a.shiftCount - b.shiftCount);
              let targetCount = rule.count;
              if (rule.required) {
                Object.keys(rule.required).forEach((role) => {
                  let needed =
                    rule.required[role] -
                    weekendStaff[loc].filter(
                      (e) => e.type === role && e.type !== "נחפף",
                    ).length;
                  while (needed > 0 && weekendStaff[loc].length < targetCount) {
                    let candIndex = candidates.findIndex(
                      (e) => e.type === role,
                    );
                    if (candIndex > -1) {
                      let c = candidates.splice(candIndex, 1)[0];
                      c.shiftCount++;
                      c.isPref = true;
                      weekendStaff[loc].push(c);
                      needed--;
                    } else break;
                  }
                });
              }
              while (
                weekendStaff[loc].length < targetCount &&
                candidates.length > 0
              ) {
                let c = candidates.shift();
                c.shiftCount++;
                c.isPref = true;
                weekendStaff[loc].push(c);
              }

              // fallback: אם עדיין חסרים — בחר לפי טבלת צדק (מי עשה הכי פחות סופ"שים)
              if (weekendStaff[loc].length < targetCount) {
                const wShiftsForLoc = loc === LOC_MATAL ? weekendShiftsMATAL : weekendShiftsZira;
                let fairCandidates = shuffledStaff.filter(e =>
                  rule.roles.includes(e.type) &&
                  !e.workedLastWeekend &&
                  !e.noNights &&
                  e.type !== "קבינט בכיר" &&
                  !weekendStaff[LOC_MATAL].find(x => x.id === e.id) &&
                  !weekendStaff[LOC_ZIRA].find(x => x.id === e.id) &&
                  !(e.type === "נחפף" && loc === LOC_ZIRA && !e.ziraWeekendAllowed) &&
                  (e.fixedLoc === "" || e.fixedLoc === loc || !e.fixedLoc || e.fixedLoc === undefined) &&
                  !wShiftsForLoc.some(sk => (e.constraints || []).includes(sk))
                ).sort((a, b) => {
                  const aW = (window.weekendHistory[a.name] || []).length;
                  const bW = (window.weekendHistory[b.name] || []).length;
                  return aW !== bW ? aW - bW : a.shiftCount - b.shiftCount;
                });
                while (weekendStaff[loc].length < targetCount && fairCandidates.length > 0) {
                  let c = fairCandidates.shift();
                  if (weekendStaff[LOC_MATAL].find(x => x.id === c.id) || weekendStaff[LOC_ZIRA].find(x => x.id === c.id)) continue;
                  c.shiftCount++;
                  c.isPref = true;
                  weekendStaff[loc].push(c);
                }
              }
            }
          });

          weekendShiftsMATAL.forEach((sk) => {
            let [day, shift] = sk.split("-");
            weekendStaff[LOC_MATAL].forEach((e) => {
              if (
                !window.currentSchedule[sk][LOC_MATAL].find(
                  (x) => x.id === e.id,
                )
              )
                window.currentSchedule[sk][LOC_MATAL].push(e);
              if (!dayLog[day].includes(e.id)) dayLog[day].push(e.id);
            });
          });
          weekendShiftsZira.forEach((sk) => {
            let [day, shift] = sk.split("-");
            weekendStaff[LOC_ZIRA].forEach((e) => {
              if (
                !window.currentSchedule[sk][LOC_ZIRA].find((x) => x.id === e.id)
              )
                window.currentSchedule[sk][LOC_ZIRA].push(e);
              if (!dayLog[day].includes(e.id)) dayLog[day].push(e.id);
            });
          });

          days.slice(0, 5).forEach((day, dIdx) => {
            let restingToday = [];
            activeStaff.forEach((emp) => {
              let empConst = emp.constraints || [];
              let isFullOff =
                empConst.includes(`${day}-בוקר`) &&
                empConst.includes(`${day}-ערב`) &&
                empConst.includes(`${day}-לילה`);

              // נחפפים לא נחים בראשון אם עשו שבת, הם עושים בוקר זירה!
              let isNachpafPostWeekend =
                day === "ראשון" && emp.workedLastWeekend && emp.type === "נחפף";

              if (
                day === "ראשון" &&
                emp.workedLastWeekend &&
                !isNachpafPostWeekend
              )
                restingToday.push({ emp, reason: "אחרי שבת", icon: "💤" });
              else if (
                dIdx > 0 &&
                dayLog[days[dIdx - 1]] &&
                window.currentSchedule[`${days[dIdx - 1]}-לילה`] &&
                (window.currentSchedule[`${days[dIdx - 1]}-לילה`][
                  LOC_MATAL
                ].find((e) => e.id === emp.id) ||
                  window.currentSchedule[`${days[dIdx - 1]}-לילה`][
                    LOC_ZIRA
                  ].find((e) => e.id === emp.id))
              )
                restingToday.push({ emp, reason: "אחרי לילה", icon: "🌙" });
              else if (
                dIdx > 0 &&
                (window.isEmergencyMode || window.currentSchedule.matalUnderstaff === true) &&
                window.currentSchedule[`${days[dIdx - 1]}-24 שעות`] &&
                baseLocs.some((l) =>
                  window.currentSchedule[`${days[dIdx - 1]}-24 שעות`][l] &&
                  window.currentSchedule[`${days[dIdx - 1]}-24 שעות`][l].find((e) => e.id === emp.id)
                )
              )
                restingToday.push({ emp, reason: "אחרי 24ש", icon: "😴" });
              else if (isFullOff)
                restingToday.push({ emp, reason: "יום חופש מלא", icon: "🌴" });
              else {
                if (empConst.includes(`${day}-בוקר`))
                  restingToday.push({ emp, reason: "חופש בוקר", icon: "🌴" });
                if (empConst.includes(`${day}-ערב`))
                  restingToday.push({ emp, reason: "חופש ערב", icon: "🌴" });
                if (empConst.includes(`${day}-לילה`))
                  restingToday.push({ emp, reason: "חופש לילה", icon: "🌴" });
                // זמינות משמרות לפי הגדרת העובד — מסומן כ"חופש" לאותה משמרת כדי שלא ישובץ
                if (emp.canMorning === false)
                  restingToday.push({ emp, reason: "חופש בוקר", icon: "☀️" });
                if (emp.canEvening === false)
                  restingToday.push({ emp, reason: "חופש ערב", icon: "🌇" });
                if (emp.canNight === false || emp.noNights === true)
                  restingToday.push({ emp, reason: "חופש לילה", icon: "🌙" });
              }
            });
            // אילוצים חלקיים (חופש בוקר/ערב) משמשים לשיבוץ בלבד — לא מוצגים כסטטוס
            window.currentNotesLog[day] = restingToday.filter(r =>
              r.reason === "אחרי לילה" ||
              r.reason === "אחרי 24ש" ||
              r.reason === "אחרי שבת" ||
              r.reason === "יום חופש מלא"
            );

            if (day === "רביעי") {
              let pastWeekendStaff = activeStaff.filter(
                (e) =>
                  e.workedLastWeekend &&
                  !e.noNights &&
                  e.type !== "נחפף" &&
                  e.type !== "קבינט בכיר",
              );
              pastWeekendStaff.forEach((e) => {
                let empConst = e.constraints || [];
                if (
                  !empConst.includes("רביעי-לילה") &&
                  !dayLog["רביעי"].includes(e.id) &&
                  !restingToday.find((r) => r.emp.id === e.id)
                ) {
                  if (
                    !window.currentSchedule["רביעי-לילה"][LOC_MATAL].find(
                      (x) => x.id === e.id,
                    )
                  ) {
                    window.currentSchedule["רביעי-לילה"][LOC_MATAL].push({
                      ...e,
                      isPref: true,
                      note: "הכנה לשבת",
                    });
                  }
                  dayLog["רביעי"].push(e.id);
                  e.shiftCount++;
                }
              });
            }

            const nightSk = `${day}-לילה`;
            const nextDayMorningSk = `${days[(dIdx + 1) % 7]}-בוקר`;
            baseLocs.forEach((loc) => {
              if (day === "חמישי" && loc === LOC_MATAL) return;
              if (window.isShiftLocked(day, "לילה", loc)) return;
              // במצב חוסר מת"ל — המשמרת הרגילה מוחלפת ב-24ש, דלג על מת"ל
              if (window.currentSchedule.matalUnderstaff === true && loc === LOC_MATAL) return;
              const rule = window.isHoliday(day)
                ? window.rules[loc]["weekend"]
                : window.rules[loc]["weekday_לילה"];
              if (rule) {
                let candidates = activeStaff
                  .filter((e) => {
                    let empConst = e.constraints || [];
                    // (הוסר כלל מקודד בשם — כעת נשלט ע"י מתג "🌙 לילה" בהגדרות העובד)

                    return (
                      e.type !== "נחפף" &&
                      e.type !== "קבינט בכיר" &&
                      rule.roles.includes(e.type) &&
                      !e.noNights &&
                      !empConst.includes(nightSk) &&
                      !empConst.includes(nextDayMorningSk) &&
                      !restingToday.find(
                        (r) =>
                          r.emp.id === e.id &&
                          (r.reason === "אחרי שבת" ||
                            r.reason === "אחרי לילה" ||
                            r.reason === "אחרי 24ש" ||
                            r.reason === "יום חופש מלא" ||
                            r.reason === "חופש לילה"),
                      ) &&
                      !dayLog[day].includes(e.id) &&
                      !(
                        day === "חמישי" &&
                        weekendStaff[LOC_ZIRA].find((x) => x.id === e.id)
                      ) &&
                      window.isAllowedInLoc(e, day, "לילה", loc)
                    );
                  })
                  .sort((a, b) => a.shiftCount - b.shiftCount);

                let targetLimit =
                  loc === LOC_ZIRA
                    ? Math.max(
                        rule.count,
                        window.currentSchedule[nightSk][loc].filter(
                          (e) => e.isPref,
                        ).length,
                        2,
                      )
                    : rule.count;
                let schedArr = window.currentSchedule[nightSk][loc];

                let hasCapableManager = schedArr.some(
                  (x) =>
                    x.type === "קבינט בכיר" ||
                    x.type === "מילואים" ||
                    (x.type === "קבע" && x.canManNightAlone),
                );
                if (hasCapableManager)
                  targetLimit = Math.max(
                    1,
                    schedArr.filter((e) => e.isPref).length,
                  );

                if (rule.required) {
                  Object.keys(rule.required).forEach((role) => {
                    let needed =
                      rule.required[role] -
                      schedArr.filter((e) => e.type === role).length;
                    while (needed > 0 && schedArr.length < targetLimit) {
                      let cIdx = candidates.findIndex((e) => e.type === role);
                      if (cIdx > -1) {
                        let c = candidates.splice(cIdx, 1)[0];
                        c.shiftCount++;
                        schedArr.push(c);
                        dayLog[day].push(c.id);
                        needed--;
                      } else break;
                    }
                  });
                }
                while (schedArr.length < targetLimit && candidates.length > 0) {
                  let c = candidates.shift();
                  c.shiftCount++;
                  schedArr.push(c);
                  dayLog[day].push(c.id);
                }
              }
            });

            let ziraNight = window.currentSchedule[nightSk][LOC_ZIRA];
            if (ziraNight) {
              let hasManagerBAlone = ziraNight.some(
                (e) => e.type === "קבע" && !e.canManNightAlone,
              );
              let hasWorkerA = ziraNight.some((e) => e.type === "טכנאי");
              if (hasManagerBAlone && !hasWorkerA) {
                let workerA = activeStaff
                  .filter((e) => {
                    let empConst = e.constraints || [];
                    return (
                      e.type === "טכנאי" &&
                      !e.noNights &&
                      !empConst.includes(nightSk) &&
                      !empConst.includes(nextDayMorningSk) &&
                      !dayLog[day].includes(e.id)
                    );
                  })
                  .sort((a, b) => a.shiftCount - b.shiftCount)[0];
                if (workerA) {
                  ziraNight.push(workerA);
                  dayLog[day].push(workerA.id);
                  workerA.shiftCount++;
                }
              }
            }

            const eveningSk = `${day}-ערב`;
            if (!window.isOffDay(day)) {
              baseLocs.forEach((loc) => {
                if (loc === LOC_MATAL) return;
                if (window.isShiftLocked(day, "ערב", loc)) return;
                const rule = window.rules[loc]["weekday_ערב"];
                if (rule) {
                  let candidates = activeStaff
                    .filter((e) => {
                      let empConst = e.constraints || [];
                      return (
                        e.type !== "נחפף" &&
                        e.type !== "קבינט בכיר" &&
                        rule.roles.includes(e.type) &&
                        !empConst.includes(eveningSk) &&
                        !restingToday.find(
                          (r) =>
                            r.emp.id === e.id &&
                            (r.reason === "אחרי שבת" ||
                              r.reason === "אחרי לילה" ||
                              r.reason === "אחרי 24ש" ||
                              r.reason === "יום חופש מלא" ||
                              r.reason === "חופש ערב"),
                        ) &&
                        !dayLog[day].includes(e.id) &&
                        !(
                          day === "חמישי" &&
                          (weekendStaff[LOC_MATAL].find((x) => x.id === e.id) ||
                            weekendStaff[LOC_ZIRA].find((x) => x.id === e.id))
                        ) &&
                        window.isAllowedInLoc(e, day, "ערב", loc)
                      );
                    })
                    .sort((a, b) => {
                      // חוקים ידועים: שגיא בעדיפות אחרונה לערב
                      if (a.name === "שגיא" && b.name !== "שגיא") return 1;
                      if (b.name === "שגיא" && a.name !== "שגיא") return -1;
                      return a.shiftCount - b.shiftCount;
                    });
                  let schedArr = window.currentSchedule[eveningSk][loc];
                  if (rule.required) {
                    Object.keys(rule.required).forEach((role) => {
                      let needed =
                        rule.required[role] -
                        schedArr.filter((e) => e.type === role).length;
                      while (needed > 0 && schedArr.length < rule.count) {
                        let cIdx = candidates.findIndex((e) => e.type === role);
                        if (cIdx > -1) {
                          let c = candidates.splice(cIdx, 1)[0];
                          c.shiftCount++;
                          schedArr.push(c);
                          dayLog[day].push(c.id);
                          needed--;
                        } else break;
                      }
                    });
                  }
                  while (
                    schedArr.length < rule.count &&
                    candidates.length > 0
                  ) {
                    let c = candidates.shift();
                    c.shiftCount++;
                    schedArr.push(c);
                    dayLog[day].push(c.id);
                  }
                }
              });
            }

            const morningSk = `${day}-בוקר`;
            const _mUDay = window.currentSchedule.matalUnderstaff === true;

            // במצב חוסר מת"ל — מלא 24ש מת"ל לפני הקצאת בוקר זירה
            // כך הטכנאים שנבחרים ל-24ש נכנסים לdayLog ולא ייבחרו לבוקר זירה
            if (_mUDay && ["ראשון","שני","שלישי","רביעי","חמישי"].includes(day)) {
              const sk24 = `${day}-24 שעות`;
              if (window.currentSchedule[sk24] && window.currentSchedule[sk24][LOC_MATAL] &&
                  !window.isShiftLocked(day, "24 שעות", LOC_MATAL)) {
                let schedArr24 = window.currentSchedule[sk24][LOC_MATAL];
                const rule24 = window.rules && window.rules[LOC_MATAL] && window.rules[LOC_MATAL]["weekday_24 שעות"];
                const targetCount24 = rule24 ? rule24.count : 2;
                const validRoles24 = rule24 && rule24.roles && rule24.roles.length > 0
                  ? rule24.roles : ["טכנאי", "נחפף", "קבע", "מילואים"];
                if (schedArr24.length < targetCount24) {
                  let candidates24 = activeStaff.filter((e) => {
                    if (!validRoles24.includes(e.type)) return false;
                    if (e.fixedLoc === LOC_ZIRA) return false;
                    if (schedArr24.find((x) => x.id === e.id)) return false;
                    if (dayLog[day] && dayLog[day].includes(e.id)) return false;
                    if (restingToday.find(r => r.emp.id === e.id &&
                      (r.reason === "אחרי לילה" || r.reason === "אחרי 24ש" ||
                       r.reason === "אחרי שבת" || r.reason === "יום חופש מלא"))) return false;
                    if (day === "ראשון" && e.workedLastWeekend) return false;
                    return true;
                  }).sort((a, b) => (a.shiftCount || 0) - (b.shiftCount || 0));
                  while (schedArr24.length < targetCount24 && candidates24.length > 0) {
                    let chosen = candidates24.shift();
                    schedArr24.push({ ...chosen, isPref: true });
                    dayLog[day].push(chosen.id);
                    chosen.shiftCount = (chosen.shiftCount || 0) + 1;
                  }
                }
              }
            }

            if (!window.isOffDay(day)) {
              activeStaff
                .filter((e) => e.type === "קבינט בכיר")
                .forEach((m) => {
                  let empConst = m.constraints || [];
                  if (
                    !empConst.includes(morningSk) &&
                    !restingToday.find(
                      (r) =>
                        r.emp.id === m.id &&
                        r.reason !== "חופש לילה" &&
                        r.reason !== "חופש ערב",
                    ) &&
                    !dayLog[day].includes(m.id)
                  ) {
                    if (m.fixedLoc && m.fixedLoc !== "") {
                      if (
                        !window.currentSchedule[morningSk][m.fixedLoc].find(
                          (x) => x.id === m.id,
                        )
                      ) {
                        window.currentSchedule[morningSk][m.fixedLoc].push(m);
                        dayLog[day].push(m.id);
                        m.shiftCount++;
                      }
                    } else if (_mUDay) {
                      // במצב חוסר מת"ל — מנהל ללא fixedLoc הולך לנוכח מת"ל
                      if (!window.currentSchedule[morningSk][LOC_MATAL].find(x => x.id === m.id)) {
                        window.currentSchedule[morningSk][LOC_MATAL].push(m);
                        dayLog[day].push(m.id);
                        m.shiftCount++;
                      }
                    }
                  }
                });

              let morningPool = activeStaff
                .filter((e) => {
                  let empConst = e.constraints || [];
                  // (הוסר כלל מקודד בשם — כעת נשלט ע"י מתג "☀️ בוקר" בהגדרות העובד)

                  return (
                    e.type !== "קבינט בכיר" &&
                    !empConst.includes(morningSk) &&
                    !restingToday.find(
                      (r) =>
                        r.emp.id === e.id &&
                        (r.reason === "אחרי שבת" ||
                          r.reason === "אחרי לילה" ||
                          r.reason === "אחרי 24ש" ||
                          r.reason === "יום חופש מלא" ||
                          r.reason === "חופש בוקר"),
                    ) &&
                    !dayLog[day].includes(e.id) &&
                    !(
                      day === "חמישי" &&
                      (weekendStaff[LOC_MATAL].find((x) => x.id === e.id) ||
                        weekendStaff[LOC_ZIRA].find((x) => x.id === e.id))
                    )
                  );
                })
                .sort((a, b) => a.shiftCount - b.shiftCount);
              let cMatal = window.currentSchedule[morningSk][LOC_MATAL].length;
              let cZira = window.currentSchedule[morningSk][LOC_ZIRA].length;

              morningPool.forEach((emp) => {
                if (emp.type === "נחפף") {
                  let destLoc =
                    emp.fixedLoc ||
                    (Math.random() > 0.5 ? LOC_MATAL : LOC_ZIRA);
                  if (emp.workedLastWeekend) {
                    if (day === "ראשון") destLoc = LOC_ZIRA;
                    if (day === "שני") destLoc = LOC_MATAL;
                  }
                  // במצב חוסר מת"ל — לא שולחים לבוקר מת"ל
                  if (_mUDay && destLoc === LOC_MATAL) destLoc = LOC_ZIRA;
                  if (window.isShiftLocked(day, "בוקר", destLoc)) return;
                  if (
                    !window.currentSchedule[morningSk][destLoc].find(
                      (x) => x.id === emp.id,
                    )
                  ) {
                    window.currentSchedule[morningSk][destLoc].push(emp);
                    dayLog[day].push(emp.id);
                    emp.shiftCount++;
                  }
                } else {
                  if (emp.fixedLoc === LOC_MATAL || emp.fixedLoc === LOC_ZIRA) {
                    // במצב חוסר מת"ל — מי שקבוע במת"ל לא הולך לבוקר מת"ל (ישובץ ב-24ש)
                    if (_mUDay && emp.fixedLoc === LOC_MATAL) return;
                    if (window.isShiftLocked(day, "בוקר", emp.fixedLoc)) return;
                    if (
                      !window.currentSchedule[morningSk][emp.fixedLoc].find(
                        (x) => x.id === emp.id,
                      )
                    ) {
                      window.currentSchedule[morningSk][emp.fixedLoc].push(emp);
                      dayLog[day].push(emp.id);
                      emp.shiftCount++;
                    }
                    if (emp.fixedLoc === LOC_MATAL) cMatal++;
                    else cZira++;
                  } else {
                    if (_mUDay) {
                      // במצב חוסר מת"ל — כולם לזירה (מת"ל נעשה 24ש)
                      if (!window.isShiftLocked(day, "בוקר", LOC_ZIRA) &&
                          !window.currentSchedule[morningSk][LOC_ZIRA].find(x => x.id === emp.id)) {
                        window.currentSchedule[morningSk][LOC_ZIRA].push(emp);
                        dayLog[day].push(emp.id);
                        emp.shiftCount++;
                        cZira++;
                      }
                    } else if (cMatal <= cZira) {
                      if (window.isShiftLocked(day, "בוקר", LOC_MATAL)) { cZira++; return; }
                      if (
                        !window.currentSchedule[morningSk][LOC_MATAL].find(
                          (x) => x.id === emp.id,
                        )
                      ) {
                        window.currentSchedule[morningSk][LOC_MATAL].push(emp);
                        dayLog[day].push(emp.id);
                        emp.shiftCount++;
                        cMatal++;
                      }
                    } else {
                      if (window.isShiftLocked(day, "בוקר", LOC_ZIRA)) { cMatal++; return; }
                      if (
                        !window.currentSchedule[morningSk][LOC_ZIRA].find(
                          (x) => x.id === emp.id,
                        )
                      ) {
                        window.currentSchedule[morningSk][LOC_ZIRA].push(emp);
                        dayLog[day].push(emp.id);
                        emp.shiftCount++;
                        cZira++;
                      }
                    }
                  }
                }
              });

              // החלת חוק weekday_בוקר — תוספת כח אדם ספציפי לבוקר (מעבר לקבינט בכיר)
              baseLocs.forEach((loc) => {
                if (_mUDay && loc === LOC_MATAL) return; // במצב חוסר — לא ממלאים בוקר מת"ל
                const bokerRule =
                  window.rules[loc] && window.rules[loc]["weekday_בוקר"];
                if (!bokerRule || bokerRule.count <= 0) return;
                if (window.isShiftLocked(day, "בוקר", loc)) return;
                let morningArr = window.currentSchedule[morningSk][loc];
                let extraCandidates = activeStaff
                  .filter((e) => {
                    let empConst = e.constraints || [];
                    return (
                      bokerRule.roles.includes(e.type) &&
                      e.type !== "קבינט בכיר" &&
                      !empConst.includes(morningSk) &&
                      !restingToday.find(
                        (r) =>
                          r.emp.id === e.id &&
                          (r.reason === "אחרי שבת" ||
                            r.reason === "אחרי לילה" ||
                            r.reason === "אחרי 24ש" ||
                            r.reason === "יום חופש מלא" ||
                            r.reason === "חופש בוקר"),
                      ) &&
                      !morningArr.find((x) => x.id === e.id) &&
                      window.isAllowedInLoc(e, day, "בוקר", loc)
                    );
                  })
                  .sort((a, b) => a.shiftCount - b.shiftCount);
                if (bokerRule.required) {
                  Object.keys(bokerRule.required).forEach((role) => {
                    let needed =
                      bokerRule.required[role] -
                      morningArr.filter((e) => e.type === role).length;
                    while (needed > 0 && morningArr.length < bokerRule.count) {
                      let cIdx = extraCandidates.findIndex(
                        (e) => e.type === role,
                      );
                      if (cIdx > -1) {
                        let c = extraCandidates.splice(cIdx, 1)[0];
                        morningArr.push(c);
                        dayLog[day].push(c.id);
                        c.shiftCount++;
                        needed--;
                      } else break;
                    }
                  });
                }
                while (
                  morningArr.length < bokerRule.count &&
                  extraCandidates.length > 0
                ) {
                  let c = extraCandidates.shift();
                  morningArr.push(c);
                  dayLog[day].push(c.id);
                  c.shiftCount++;
                }
              });
            } else if (window.isHoliday(day)) {
              baseLocs.forEach((loc) => {
                const rule = window.rules[loc]["weekend"];
                if (rule) {
                  let candidates = activeStaff
                    .filter((e) => {
                      let empConst = e.constraints || [];
                      return (
                        e.type !== "קבינט בכיר" &&
                        rule.roles.includes(e.type) &&
                        !empConst.includes(morningSk) &&
                        !restingToday.find(
                          (r) =>
                            r.emp.id === e.id &&
                            (r.reason === "אחרי שבת" ||
                              r.reason === "אחרי לילה" ||
                              r.reason === "אחרי 24ש" ||
                              r.reason === "יום חופש מלא" ||
                              r.reason === "חופש בוקר"),
                        ) &&
                        !dayLog[day].includes(e.id) &&
                        window.isAllowedInLoc(e, day, "בוקר", loc)
                      );
                    })
                    .sort((a, b) => a.shiftCount - b.shiftCount);
                  let schedArr = window.currentSchedule[morningSk][loc];
                  if (rule.required) {
                    Object.keys(rule.required).forEach((role) => {
                      let needed =
                        rule.required[role] -
                        schedArr.filter(
                          (e) => e.type === role && e.type !== "נחפף",
                        ).length;
                      while (needed > 0 && schedArr.length < rule.count) {
                        let cIdx = candidates.findIndex((e) => e.type === role);
                        if (cIdx > -1) {
                          let c = candidates.splice(cIdx, 1)[0];
                          c.shiftCount++;
                          schedArr.push(c);
                          dayLog[day].push(c.id);
                          needed--;
                        } else break;
                      }
                    });
                  }
                  while (
                    schedArr.length < rule.count &&
                    candidates.length > 0
                  ) {
                    let c = candidates.shift();
                    c.shiftCount++;
                    schedArr.push(c);
                    dayLog[day].push(c.id);
                  }
                }
              });
            }
          });
        }

        // מילוי מת"ל 24ש במצב חוסר כח אדם
        if (window.currentSchedule.matalUnderstaff === true && !window.isEmergencyMode) {
          const _mU_activeStaff = window.staff.filter((e) => e.isActive !== false);
          days.forEach((day, dIdx) => {
            const sk24 = `${day}-24 שעות`;
            if (!window.currentSchedule[sk24] || !window.currentSchedule[sk24][LOC_MATAL]) return;
            if (window.isShiftLocked(day, "24 שעות", LOC_MATAL)) return;
            let schedArr = window.currentSchedule[sk24][LOC_MATAL];
            const isWeekend = window.isOffDay && window.isOffDay(day);
            const ruleKey = isWeekend ? "weekend" : "weekday_24 שעות";
            const rule = window.rules && window.rules[LOC_MATAL] && window.rules[LOC_MATAL][ruleKey];
            const targetCount = rule ? rule.count : 2;
            const validRoles = rule && rule.roles && rule.roles.length > 0 ? rule.roles : ["טכנאי", "נחפף", "קבע", "מילואים"];
            if (schedArr.length >= targetCount) return;
            let prevDay = dIdx > 0 ? days[dIdx - 1] : null;
            let available = _mU_activeStaff.filter((e) => {
              if (!validRoles.includes(e.type)) return false;
              if (schedArr.find((x) => x.id === e.id)) return false;
              if (dayLog[day] && dayLog[day].includes(e.id)) return false;
              let empConst = e.constraints || [];
              if (empConst.includes(`${day}-בוקר`) && empConst.includes(`${day}-לילה`)) return false;
              if (prevDay) {
                let workedPrevNight = baseLocs.some((l) =>
                  window.currentSchedule[`${prevDay}-לילה`] &&
                  window.currentSchedule[`${prevDay}-לילה`][l] &&
                  window.currentSchedule[`${prevDay}-לילה`][l].find((x) => x.id === e.id)
                );
                if (workedPrevNight) return false;
                // אחרי 24ש מת"ל — לא ניתן לשבץ ל-24ש ביום למחרת
                let workedPrev24 = baseLocs.some((l) =>
                  window.currentSchedule[`${prevDay}-24 שעות`] &&
                  window.currentSchedule[`${prevDay}-24 שעות`][l] &&
                  window.currentSchedule[`${prevDay}-24 שעות`][l].find((x) => x.id === e.id)
                );
                if (workedPrev24) return false;
              }
              if (day === "ראשון" && e.workedLastWeekend) return false;
              return true;
            }).sort((a, b) => (a.shiftCount || 0) - (b.shiftCount || 0));
            while (schedArr.length < targetCount && available.length > 0) {
              let chosen = available.shift();
              schedArr.push({ ...chosen, isPref: true });
              if (dayLog[day]) dayLog[day].push(chosen.id);
              chosen.shiftCount = (chosen.shiftCount || 0) + 1;
            }
          });
        }

        window.triggerUnsavedChanges();
      };

      // הסרת הכוכבים (★) מפונקציות הציור שכבר קיימות בקוד שלך
      window.renderTable = function (data, notesLog) {
        if (!window.currentMobileDay) window.currentMobileDay = 1;
        const pubBtn = document.getElementById("publishBtn");
        if (pubBtn && data) {
          pubBtn.innerText = data.isPublished
            ? "🙈 הסתר לוח מעובדים"
            : "👁️ פרסם לוח לעובדים";
          pubBtn.className = data.isPublished
            ? "btn btn-outlined manager-only"
            : "btn btn-success manager-only";
        }

        if (window.isWorkerMode) {
          document
            .querySelectorAll(".container")
            .forEach((c) => c.classList.remove("active"));
          const schedPage = document.getElementById("page-schedule");
          if (
            schedPage &&
            !document
              .getElementById("page-worker-requests")
              .classList.contains("active") &&
            !document.getElementById("page-tasks").classList.contains("active")
          ) {
            schedPage.classList.add("active");
          }
        }
        if (window.isWorkerMode && data && !data.isPublished) {
          const lockedMsg = `<div style="text-align:center; padding:50px 20px; color:var(--md-text-secondary);"><h2 style="font-size:2rem; margin-bottom:10px;">🔒</h2><h3>המשמרות לשבוע זה טרם פורסמו</h3><p>המנהל עדיין עובד על סידור העבודה. אנא חזור מאוחר יותר.</p></div>`;
          const desktopContainer = document.getElementById("tableOutput");
          const mobileContainer = document.getElementById("mobileCardsOutput");
          if (desktopContainer) desktopContainer.innerHTML = lockedMsg;
          if (mobileContainer) mobileContainer.innerHTML = lockedMsg;
          return;
        }
        if (!data || Object.keys(data).length <= 1) {
          const emptyMsg =
            "<div style='padding:20px; text-align:center;'><em>אין נתונים / לוח ריק.</em></div>";
          const desktopContainer = document.getElementById("tableOutput");
          const mobileContainer = document.getElementById("mobileCardsOutput");
          if (desktopContainer) desktopContainer.innerHTML = emptyMsg;
          if (mobileContainer) mobileContainer.innerHTML = emptyMsg;
          return;
        }

        const _matalUnderstaff = window.currentSchedule && window.currentSchedule.matalUnderstaff === true;
        const _weekSunForRows = window.getSunday(window.currentWeekOffset || 0);
        const _dayModes = days.map(function(d, i) {
          return (typeof window.getDayModeRT === 'function')
            ? window.getDayModeRT(i, _weekSunForRows, data)
            : (window.isEmergencyMode ? 'emergency' : _matalUnderstaff ? 'matal' : 'normal');
        });
        const _weekHasEmergency = _dayModes.includes('emergency');
        const _weekHasMatal = _dayModes.includes('matal');
        const _weekHasNormal = _dayModes.includes('normal');

        let scheduleRows = [];
        if (_weekHasNormal || _weekHasMatal) {
          // זירה מוצגת הן במצב רגיל והן במצב מת"ל חוסר
          scheduleRows.push({ loc: LOC_ZIRA, shift: "בוקר", showForModes: ["normal", "matal"] });
          scheduleRows.push({ loc: LOC_ZIRA, shift: "ערב", showForModes: ["normal", "matal"] });
          scheduleRows.push({ loc: LOC_ZIRA, shift: "לילה", showForModes: ["normal", "matal"] });
          // מת"ל רגיל — רק אם אין ימי חוסר בשבוע זה
          if (_weekHasNormal && !_weekHasMatal) {
            scheduleRows.push({ loc: LOC_MATAL, shift: "בוקר", showForModes: ["normal"] });
            scheduleRows.push({ loc: LOC_MATAL, shift: "לילה", showForModes: ["normal"] });
          }
          // מת"ל חוסר — ראשון–חמישי: 24ש + נוכח; שישי–שבת: משמרות רגילות
          if (_weekHasMatal) {
            scheduleRows.push({ loc: LOC_MATAL, shift: "בוקר", label: "בוקר (נוכח)", onlyDays: ["ראשון","שני","שלישי","רביעי","חמישי"], showForModes: ["matal"] });
            scheduleRows.push({ loc: LOC_MATAL, shift: "24 שעות", onlyDays: ["ראשון","שני","שלישי","רביעי","חמישי"], showForModes: ["matal"] });
            scheduleRows.push({ loc: LOC_MATAL, shift: "בוקר", onlyDays: ["שישי","שבת"], showForModes: ["matal"] });
            scheduleRows.push({ loc: LOC_MATAL, shift: "לילה", onlyDays: ["שישי","שבת"], showForModes: ["matal"] });
          }
        }
        if (_weekHasEmergency) {
          scheduleRows.push({ loc: LOC_ZIRA, shift: "24 שעות", showForModes: ["emergency"] });
          scheduleRows.push({ loc: LOC_MATAL, shift: "24 שעות", showForModes: ["emergency"] });
        }

        // הדגשת היום הנוכחי בטבלה
        const _todayRaw2 = new Date();
        const _todayDate = new Date(_todayRaw2.getFullYear(), _todayRaw2.getMonth(), _todayRaw2.getDate());
        const _weekSun = window.getSunday(window.currentWeekOffset || 0);
        const _todayIdx = Math.floor((_todayDate - _weekSun) / 86400000);
        const _todayDay = (_todayIdx >= 0 && _todayIdx < 7) ? days[_todayIdx] : null;
        // במובייל - פתח אוטומטית להיום הנוכחי בטעינה הראשונה בלבד — לא לדרוס בחירת יום של המשתמש
        if (_todayDay && window.currentWeekOffset === 0 && !window._mobileDayInitialized) {
          window.currentMobileDay = _todayIdx + 1;
        }
        window._mobileDayInitialized = true;

        let html = `<table><tr><th style="width:120px;">מיקום וזמן</th>`;
        days.forEach((d, dIdx) => {
          let note =
            data.dailyNotes && data.dailyNotes[d] ? data.dailyNotes[d] : "";
          let noteHtml = "";
          if (!window.isWorkerMode) {
            noteHtml = `<br><input type="text" value="${note}" placeholder="📝 הערת יום..." onchange="window.updateDailyNote('${d}', this.value)" style="width:90%; margin-top:5px; font-size:0.8rem; padding:4px; text-align:center; border:1px dashed #cbd5e1; background:#f8fafc;">`;
          } else if (note) {
            noteHtml = `<br><span style="font-size:0.8rem; color:#ea580c; background:#ffedd5; padding:2px 6px; border-radius:4px; display:inline-block; margin-top:4px;">${note}</span>`;
          }
          // תאריך היום — מתחת לשם היום, מעל ההערה
          const _cellDate = new Date(_weekSun);
          _cellDate.setDate(_cellDate.getDate() + dIdx);
          const _dateStr = `${_cellDate.getDate()}/${_cellDate.getMonth() + 1}`;
          const dateHtml = `<br><span style="font-size:0.75rem; color:var(--md-text-secondary); font-weight:normal;">${_dateStr}</span>`;
          const isTodayCol = d === _todayDay;
          const _dayHL = data.dayHighlights && data.dayHighlights[d];
          const _hlStyle = _dayHL ? `background:${_dayHL}28; border-bottom:3px solid ${_dayHL};` : '';
          const _hlBtn = !window.isWorkerMode ? `<span style="cursor:pointer;font-size:0.75rem;opacity:0.7;vertical-align:middle;margin-right:2px;" onclick="window.toggleDayHighlight('${d}')" title="הדגש יום">${_dayHL ? '🔶' : '◻️'}</span>` : '';
          html += `<th${isTodayCol ? ' class="today-col"' : ''}${_hlStyle ? ` style="${_hlStyle}"` : ''}>${d} ${window.isHoliday && window.isHoliday(d) ? "✨" : ""} ${_hlBtn}${dateHtml}${noteHtml}</th>`;
        });
        html += `</tr>`;

        scheduleRows.forEach((r) => {
          let safeLoc = r.loc.replace(/"/g, "&quot;");
          html += `<tr><td style="background:var(--md-bg); font-weight:500;"><b style="color:var(--md-primary); font-size:1.1em;">${window.getLocName(r.loc)}</b><br><span style="font-size:0.9em;">${r.label || r.shift}</span><span class="time-label">${window.getShiftTime(r.loc, r.shift)}</span></td>`;
          days.forEach((d) => {
            const isTodayTd = d === _todayDay;
            html += `<td${isTodayTd ? ' class="today-col"' : ''}>`;
            if (window.isOffDay && window.isOffDay(d) && r.shift === "ערב") {
              html += `</td>`;
              return;
            }
            if (r.onlyDays && !r.onlyDays.includes(d)) {
              html += `</td>`;
              return;
            }
            const _dIdx = days.indexOf(d);
            if (r.showForModes && !r.showForModes.includes(_dayModes[_dIdx])) {
              html += `<div style="height:40px;background:#f1f5f9;border-radius:4px;opacity:0.35;margin:2px 0;"></div></td>`;
              return;
            }
            const assigned =
              data[`${d}-${r.shift}`] && data[`${d}-${r.shift}`][r.loc]
                ? data[`${d}-${r.shift}`][r.loc]
                : [];
            let dropEvents = window.isEditMode
              ? `ondragover="window.allowDrop(event)" ondragleave="window.dragLeave(event)" ondrop="window.drop(event, '${d}', '${r.shift}', '${safeLoc}')"`
              : "";

            const _shiftLocked = window.isShiftLocked(d, r.shift, r.loc);
            const _shiftLockBtn = window.isEditMode
              ? `<span style="float:left; cursor:pointer; font-size:0.85rem; opacity:${_shiftLocked ? 1 : 0.35};" onclick="window.toggleShiftLock('${d}','${r.shift}','${safeLoc}')" title="${_shiftLocked ? 'שחרר נעילת משמרת' : 'נעל משמרת (מונע השלמה אוטומטית)'}">🔒</span>`
              : "";
            const _locBoxStyle = _shiftLocked ? ' style="background:rgba(245,158,11,0.08); border:1px dashed #f59e0b;"' : '';
            html += `<div class="loc-box" data-loc="${r.loc}" data-shift="${r.shift}" ${dropEvents}${_locBoxStyle}>${_shiftLockBtn}`;
            if (assigned.length > 0) {
              assigned.forEach((e) => {
                const lockIcon = (window.isWorkerMode || !window.isEditMode) ? "" : e.isLocked
                  ? `<span style="cursor:pointer; margin-left:4px;" onclick="window.toggleLock('${d}','${r.shift}','${safeLoc}',${e.id})" title="שחרר נעילת עובד">🔒</span>`
                  : `<span style="cursor:pointer; margin-left:4px; opacity:0.3;" onclick="window.toggleLock('${d}','${r.shift}','${safeLoc}',${e.id})" title="נעל עובד זה">🔓</span>`;
                const removeBtn = window.isEditMode
                  ? `<a class="remove-btn" onclick="window.removeEmp('${d}','${r.shift}','${safeLoc}',${e.id})">✕</a>`
                  : "";
                const dragAttr = window.isEditMode
                  ? `draggable="true" ondragstart="window.dragStart(event, ${e.id}, '${d}', '${r.shift}', '${safeLoc}')"`
                  : "";
                const extraNote = e.note
                  ? ` <span style="font-size:0.75em; color:var(--md-text-secondary); margin-right:4px;">(${e.note})</span>`
                  : "";
                let t = e.type || "";
                let isMe =
                  window.loggedInUser && window.loggedInUser.id === e.id
                    ? " highlight-me"
                    : "";
                html += `<span class="name-chip chip-${t.replace(/\s+/g, "-")}${isMe}" data-role="${e.type}" data-name="${e.name}" ${dragAttr}>${removeBtn}${lockIcon}${e.name}${extraNote}</span>`;
              });
            } else {
              html += `<span style="color:transparent;">.</span>`;
            }
            html += `</div></td>`;
          });
          html += `</tr>`;
        });

        let hasSpecial = days.some((d) => window.getSpecialsForDay(d, data).length > 0);
        if (hasSpecial) {
          html += `<tr><td class="td-special-header"><b style="font-size:1.1em;">🚩 סטטוס מיוחד</b><br><span style="font-size:0.8em;">(אקסל בלבד)</span></td>`;
          days.forEach((d) => {
            html += `<td class="td-special-cell">`;
            let specs = window.getSpecialsForDay(d, data);
            specs.forEach((sp) => {
              let isMe = window.loggedInUser && window.loggedInUser.id === sp.id ? " highlight-me" : "";
              let removeBtn = !window.isWorkerMode
                ? (sp._specialId != null
                    ? `<span class="mobile-remove-btn" style="margin-right:8px; cursor:pointer;" onclick="window.removeSpecialStatus(${sp._specialId})">✕</span>`
                    : sp._taskId ? ""
                    : `<span class="mobile-remove-btn" style="margin-right:8px; cursor:pointer;" onclick="window.removeLegacySpecial('${d}',${sp.id})">✕</span>`)
                : "";
              html += `<div class="name-chip chip-special${isMe}">👤 ${sp.name} <br> <b style="font-size:0.8em; margin-right:4px;">${window.specStatusLabel(sp)}</b>${removeBtn}</div>`;
            });
            html += `</td>`;
          });
          html += `</tr>`;
        }

        if (!window.isEmergencyMode) {
          html += `<tr><td style="background:rgba(245,158,11,0.1); font-weight:bold; color:#d97706;">הערות ומשימות</td>`;
          days.forEach((d) => {
            html += `<td style="vertical-align:top; border-top:2px solid var(--md-divider);">`;
            if (typeof window.systemTasks !== "undefined") {
              let weekSun = window.getSunday(window.currentWeekOffset || 0);
              let dayIdx = days.indexOf(d);
              let cellDate = new Date(weekSun);
              cellDate.setDate(cellDate.getDate() + dayIdx);
              let cellKey = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, "0")}-${String(cellDate.getDate()).padStart(2, "0")}`;
              let dayTasks = window.systemTasks.filter(
                (t) => t.date === cellKey && !t.completed,
              );
              dayTasks.forEach((t) => {
                let assign = t.assignee ? ` - ${t.assignee}` : "";
                html += `<div class="note-task">📋 ${t.category}${assign}</div>`;
              });
            }
            if (notesLog && notesLog[d]) {
              notesLog[d].forEach((n) => {
                let isVacation = n.reason && n.reason.includes("חופש");
                let colorClass = isVacation
                  ? "background:rgba(239,68,68,0.1); color:var(--md-error);"
                  : "background:rgba(245,158,11,0.1); color:var(--md-warning);";
                html += `<div class="note-chip" data-name="${n.emp.name}" style="${colorClass} padding:4px 10px; border-radius:12px; font-size:0.8em; margin:2px; display:inline-block; font-weight:bold;">${n.icon || ""} ${n.emp.name} - ${n.reason}</div>`;
              });
            }
            html += `</td>`;
          });
          html += `</tr>`;
        }

        const desktopContainer = document.getElementById("tableOutput");
        if (desktopContainer) desktopContainer.innerHTML = html + `</table>`;
        if (typeof window.applyFilters === "function") window.applyFilters();
        if (typeof window.renderMobileCards === "function")
          window.renderMobileCards(data, notesLog);
        if (typeof window.selectMobileDay === "function")
          window.selectMobileDay(window.currentMobileDay);
        if (typeof window.renderPendingRequestsManager === "function")
          window.renderPendingRequestsManager();
      };

      window.renderMobileCards = function (data, notesLog) {
        const container = document.getElementById("mobileCardsOutput");
        if (!container) return;
        if (!data || Object.keys(data).length <= 1) {
          container.innerHTML = "<em>אין נתונים / לוח ריק</em>";
          return;
        }

        let html = "";
        let mobileDayIdx = window.currentMobileDay || 1;
        let d = days[mobileDayIdx - 1];

        let note =
          data.dailyNotes && data.dailyNotes[d] ? data.dailyNotes[d] : "";
        let noteHtml = "";
        if (!window.isWorkerMode) {
          noteHtml = `<input type="text" value="${note}" placeholder="📝 הערת יום מיוחד..." onchange="window.updateDailyNote('${d}', this.value)" style="width:100%; margin-top:5px; font-size:0.85rem; padding:6px; border:1px dashed #cbd5e1; background:#f8fafc; border-radius:6px;">`;
        } else if (note) {
          noteHtml = `<div style="font-size:0.85rem; color:#ea580c; background:#ffedd5; padding:6px 10px; border-radius:6px; margin-top:6px; font-weight:bold;">📌 ${note}</div>`;
        }
        // תאריך היום הנבחר
        const _mWeekSun = window.getSunday(window.currentWeekOffset || 0);
        const _mCellDate = new Date(_mWeekSun);
        _mCellDate.setDate(_mCellDate.getDate() + (mobileDayIdx - 1));
        const _mDateStr = `${_mCellDate.getDate()}/${_mCellDate.getMonth() + 1}/${_mCellDate.getFullYear()}`;
        html += `<h3 style="margin-top:0; margin-bottom:2px; color:var(--md-primary); font-size:1.4rem; padding-right:4px;">📅 יום ${d}</h3><div style="font-size:0.9rem; color:var(--md-text-secondary); margin-bottom:8px; padding-right:4px;">${_mDateStr}</div>${noteHtml}<div style="margin-bottom:15px;"></div>`;

        const _matalUnderstaff = window.currentSchedule && window.currentSchedule.matalUnderstaff === true;
        const _weekSunForRows = window.getSunday(window.currentWeekOffset || 0);
        const _dayModes = days.map(function(d, i) {
          return (typeof window.getDayModeRT === 'function')
            ? window.getDayModeRT(i, _weekSunForRows, data)
            : (window.isEmergencyMode ? 'emergency' : _matalUnderstaff ? 'matal' : 'normal');
        });
        const _weekHasEmergency = _dayModes.includes('emergency');
        const _weekHasMatal = _dayModes.includes('matal');
        const _weekHasNormal = _dayModes.includes('normal');

        let scheduleRows = [];
        if (_weekHasNormal || _weekHasMatal) {
          // זירה מוצגת הן במצב רגיל והן במצב מת"ל חוסר
          scheduleRows.push({ loc: LOC_ZIRA, shift: "בוקר", showForModes: ["normal", "matal"] });
          scheduleRows.push({ loc: LOC_ZIRA, shift: "ערב", showForModes: ["normal", "matal"] });
          scheduleRows.push({ loc: LOC_ZIRA, shift: "לילה", showForModes: ["normal", "matal"] });
          // מת"ל רגיל — רק אם אין ימי חוסר בשבוע זה
          if (_weekHasNormal && !_weekHasMatal) {
            scheduleRows.push({ loc: LOC_MATAL, shift: "בוקר", showForModes: ["normal"] });
            scheduleRows.push({ loc: LOC_MATAL, shift: "לילה", showForModes: ["normal"] });
          }
          // מת"ל חוסר — ראשון–חמישי: 24ש + נוכח; שישי–שבת: משמרות רגילות
          if (_weekHasMatal) {
            scheduleRows.push({ loc: LOC_MATAL, shift: "בוקר", label: "בוקר (נוכח)", onlyDays: ["ראשון","שני","שלישי","רביעי","חמישי"], showForModes: ["matal"] });
            scheduleRows.push({ loc: LOC_MATAL, shift: "24 שעות", onlyDays: ["ראשון","שני","שלישי","רביעי","חמישי"], showForModes: ["matal"] });
            scheduleRows.push({ loc: LOC_MATAL, shift: "בוקר", onlyDays: ["שישי","שבת"], showForModes: ["matal"] });
            scheduleRows.push({ loc: LOC_MATAL, shift: "לילה", onlyDays: ["שישי","שבת"], showForModes: ["matal"] });
          }
        }
        if (_weekHasEmergency) {
          scheduleRows.push({ loc: LOC_ZIRA, shift: "24 שעות", showForModes: ["emergency"] });
          scheduleRows.push({ loc: LOC_MATAL, shift: "24 שעות", showForModes: ["emergency"] });
        }

        scheduleRows.forEach((r) => {
          if (window.isOffDay && window.isOffDay(d) && r.shift === "ערב") return;
          if (r.onlyDays && !r.onlyDays.includes(d)) return;
          let dayKey = `${d}-${r.shift}`;
          let empsInShift =
            data[dayKey] && data[dayKey][r.loc] ? data[dayKey][r.loc] : [];
          let shiftCustomName =
            data[dayKey] && data[dayKey][r.loc + "_customName"]
              ? data[dayKey][r.loc + "_customName"]
              : "";
          let safeLoc = r.loc.replace(/"/g, "&quot;");

          if (window.isWorkerMode && empsInShift.length === 0) return;

          html += `<div class="mobile-shift-card" style="margin-bottom: 16px;"><div class="mobile-shift-header" style="display:flex; flex-direction:column; align-items:flex-start; gap:6px;"><div style="display:flex; justify-content:space-between; width:100%; align-items:center;"><span style="font-size:1.1rem;"><b style="color:var(--md-primary);">${window.getLocName(r.loc)}</b> | ${r.label || r.shift}</span><span style="font-size:0.85rem; background:#cbd5e1; padding:4px 10px; border-radius:12px; font-weight:bold; color:#0f172a;">${empsInShift.length}</span></div>`;
          if (!window.isWorkerMode) {
            html += `<input type="text" placeholder="✍️ תן שם/הערה למשמרת זו..." value="${shiftCustomName}" style="width:100%; font-size:0.85rem; padding:8px; margin-top:4px; border:1px dashed #94a3b8; border-radius:6px; background:#f8fafc;" onchange="window.updateShiftCustomName('${d}','${r.shift}','${safeLoc}', this.value)">`;
          } else if (shiftCustomName) {
            html += `<span style="font-size:0.85rem; color:var(--md-primary); font-weight:700; background:rgba(25,118,210,0.08); padding:4px 8px; border-radius:4px; width:100%;">📌 ${shiftCustomName}</span>`;
          }
          html += `</div><div class="mobile-shift-body" style="margin-top:10px;">`;

          if (empsInShift.length === 0) {
            html += `<div style="color:#94a3b8; font-size:0.9rem; padding:8px 4px; font-style:italic;">אין עובדים משובצים</div>`;
          } else {
            empsInShift.forEach((emp) => {
              let isMe =
                window.loggedInUser && window.loggedInUser.id === emp.id
                  ? " highlight-me-mobile"
                  : "";
              // מנעול נעילת עובד — מוצג למנהלים בלבד
              const lockIcon = window.isWorkerMode
                ? ""
                : emp.isLocked
                  ? `<span style="cursor:pointer; margin-left:4px;" onclick="window.toggleLock('${d}','${r.shift}','${safeLoc}',${emp.id})">🔒</span>`
                  : window.isEditMode
                    ? `<span style="cursor:pointer; margin-left:4px; opacity:0.4;" onclick="window.toggleLock('${d}','${r.shift}','${safeLoc}',${emp.id})">🔓</span>`
                    : "";
              // הכוכב הוסר כאן
              html += `<div class="mobile-emp-chip${isMe}" style="display:inline-flex; align-items:center; background:#f1f5f9; padding:10px 16px; margin:6px 4px; border-radius:20px; font-size:1rem; border:1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">${!window.isWorkerMode ? `<span class="mobile-remove-btn" style="margin-right:12px; color:#ef4444; font-weight:bold; cursor:pointer; padding:2px 6px;" onclick="window.removeEmp('${d}','${r.shift}','${safeLoc}',${emp.id})">✕</span>` : ""}${lockIcon}<span style="font-weight:500;">👤 ${emp.name}</span>${emp.note ? `<small style="color:#64748b; margin-right:4px;">(${emp.note})</small>` : ""}</div>`;
            });
          }
          html += `</div></div>`;
        });

        let specs = window.getSpecialsForDay(d, data);
        if (specs.length > 0) {
          html += `<div class="mobile-shift-card" style="border-right-color:#9333ea; background:#faf5ff;"><div class="mobile-shift-header"><span style="color:#9333ea; font-weight:bold;">🚩 סטטוסים מיוחדים</span></div><div class="mobile-shift-body">`;
          specs.forEach((sp) => {
            let isMe = window.loggedInUser && window.loggedInUser.id === sp.id ? " highlight-me-mobile" : "";
            let removeBtn = !window.isWorkerMode
              ? (sp._specialId != null
                  ? `<span class="mobile-remove-btn" style="margin-right:12px; color:#ef4444;" onclick="window.removeSpecialStatus(${sp._specialId})">✕</span>`
                  : sp._taskId ? ""
                  : `<span class="mobile-remove-btn" style="margin-right:12px; color:#ef4444;" onclick="window.removeLegacySpecial('${d}',${sp.id})">✕</span>`)
              : "";
            html += `<div class="mobile-emp-chip mobile-chip-special${isMe}"><span>👤 ${sp.name} <br> <b style="font-size:0.85em;">${window.specStatusLabel(sp)}</b></span>${removeBtn}</div>`;
          });
          html += `</div></div>`;
        }

        // הערות מנוחה וזמינות (אחרי לילה, אחרי שבת, חופש מלא)
        if (notesLog && notesLog[d] && notesLog[d].length > 0) {
          html += `<div class="mobile-shift-card" style="border-right-color:#d97706; background:#fffbeb;"><div class="mobile-shift-header"><span style="color:#d97706; font-weight:bold;">📋 הערות זמינות</span></div><div class="mobile-shift-body" style="display:flex; flex-wrap:wrap; gap:6px; padding:4px 0;">`;
          notesLog[d].forEach((n) => {
            let isVacation = n.reason && n.reason.includes("חופש");
            let bg = isVacation ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)";
            let color = isVacation ? "#dc2626" : "#b45309";
            html += `<div style="background:${bg}; color:${color}; padding:6px 12px; border-radius:16px; font-size:0.88rem; font-weight:bold;">${n.icon || ""} ${n.emp.name} — ${n.reason}</div>`;
          });
          html += `</div></div>`;
        }

        container.innerHTML = html;
      };

      // ─── AI Schedule Generator ─────────────────────────────────────────────

      window.openAIScheduler = function () {
        const modal = document.getElementById("aiScheduleModal");
        modal.style.display = "flex";
        const hasKey = !!localStorage.getItem("shift_anthropic_key_v1");
        document.getElementById("aiKeySection").style.display = hasKey ? "none" : "block";
        document.getElementById("aiRunSection").style.display = hasKey ? "block" : "none";
        document.getElementById("aiStatus").textContent = "";
        document.getElementById("aiResult").style.display = "none";
        document.getElementById("aiApplyBar").style.display = "none";
      };

      window.saveAIKey = function () {
        const key = document.getElementById("aiKeyInput").value.trim();
        if (!key.startsWith("sk-ant")) { alert("מפתח לא תקין — חייב להתחיל ב-sk-ant"); return; }
        localStorage.setItem("shift_anthropic_key_v1", key);
        document.getElementById("aiKeySection").style.display = "none";
        document.getElementById("aiRunSection").style.display = "block";
      };

      window.resetAIKey = function () {
        localStorage.removeItem("shift_anthropic_key_v1");
        document.getElementById("aiKeyInput").value = "";
        document.getElementById("aiKeySection").style.display = "block";
        document.getElementById("aiRunSection").style.display = "none";
      };

      window.buildAIPrompt = async function () {
        const LOC_ZIRA = "זירה";
        const LOC_MATAL = 'מת"ל';
        const allDays = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
        const shifts = window.isEmergencyMode ? ["24 שעות"] : ["בוקר", "ערב", "לילה"];

        // עובדים — הגדרות מלאות (זמינות משמרות, מיקום, אילוצים, בקשות)
        const staffLines = (window.staff || [])
          .filter((e) => e.isActive !== false)
          .map((e) => {
            let parts = ["סוג: " + e.type];
            if (e.fixedLoc) parts.push("מיקום קבוע: " + e.fixedLoc);
            const avail = [];
            if (e.canMorning !== false) avail.push("בוקר");
            if (e.canEvening !== false) avail.push("ערב");
            if (e.canNight !== false && !e.noNights) avail.push("לילה");
            parts.push("זמין ל: " + (avail.length ? avail.join("/") : "—"));
            if (e.type === "טכנאי")
              parts.push(e.canZiraEvening ? "מותר ערב זירה" : "ללא ערב זירה");
            if (e.type === "נחפף")
              parts.push(e.ziraWeekendAllowed ? "מותר שבת זירה" : 'מת"ל בלבד');
            if (e.constraints && e.constraints.length)
              parts.push("אסור: " + e.constraints.join(", "));
            if (e.prefs && e.prefs.length)
              parts.push(
                "ביקש: " +
                  e.prefs
                    .map((p) => `${p.day}-${p.shift}-${p.loc}`)
                    .join(", "),
              );
            return "- " + e.name + " | " + parts.join(" | ");
          })
          .join("\n");

        // חוקי כמויות מדויקים מתוך ההגדרות
        const ruleStr = (loc, key) => {
          const r = window.rules && window.rules[loc] && window.rules[loc][key];
          if (!r || !r.count) return null;
          let s = `בדיוק ${r.count} אנשים`;
          if (r.roles && r.roles.length) s += ` (תפקידים: ${r.roles.join("/")})`;
          return s;
        };
        const ruleLines = [];
        [LOC_ZIRA, LOC_MATAL].forEach((loc) => {
          [
            ["weekday_בוקר", "בוקר"],
            ["weekday_ערב", "ערב"],
            ["weekday_לילה", "לילה"],
            ["weekend", 'סופ"ש 24ש'],
          ].forEach(([k, label]) => {
            const s = ruleStr(loc, k);
            if (s) ruleLines.push(`- ${loc} / ${label}: ${s}`);
          });
        });

        // דפוסי עבר — 6 שבועות אחרונים (כדי לשבץ לפי נטיות והרגלים)
        const pastDist = {};
        if (window._fbImports && window._firebaseDb) {
          const { ref, get } = window._fbImports;
          for (let off = -6; off <= -1; off++) {
            try {
              const sun = window.getSunday(
                (window.currentWeekOffset || 0) + off,
              );
              const wk = window.getWeekDbKey(sun);
              const snap = await get(ref(window._firebaseDb, "schedules/" + wk));
              if (!snap.exists()) continue;
              const sched = snap.val();
              allDays.forEach((d) => {
                ["בוקר", "ערב", "לילה", "24 שעות"].forEach((s) => {
                  [LOC_ZIRA, LOC_MATAL].forEach((loc) => {
                    const arr = sched[`${d}-${s}`] && sched[`${d}-${s}`][loc];
                    if (!Array.isArray(arr)) return;
                    arr.forEach((e) => {
                      if (!e || !e.name) return;
                      const dd = (pastDist[e.name] = pastDist[e.name] || {
                        בוקר: 0,
                        ערב: 0,
                        לילה: 0,
                        זירה: 0,
                        'מת"ל': 0,
                      });
                      if (s !== "24 שעות") dd[s] = (dd[s] || 0) + 1;
                      dd[loc] = (dd[loc] || 0) + 1;
                    });
                  });
                });
              });
            } catch (e) {}
          }
        }
        const pastLines = Object.keys(pastDist).map((name) => {
          const d = pastDist[name];
          return `- ${name}: בוקר×${d.בוקר || 0} ערב×${d.ערב || 0} לילה×${d.לילה || 0} | זירה×${d.זירה || 0} מת"ל×${d['מת"ל'] || 0}`;
        });

        // הוגנות סופ"ש — מי סגר הכי מעט (להעדיף לסופ"ש הקרוב)
        const wh = window.weekendHistory || {};
        const fairness = (window.staff || [])
          .filter(
            (e) => e.isActive !== false && (e.type === "טכנאי" || e.type === "נחפף"),
          )
          .map((e) => ({ name: e.name, count: (wh[e.name] || []).length }))
          .sort((a, b) => a.count - b.count);
        const fairnessLines = fairness.map(
          (f) => `- ${f.name}: ${f.count} סופ"שים בהיסטוריה`,
        );

        // לוח נוכחי + סטטוסים מיוחדים
        const currentLines = [];
        allDays.forEach((d) => {
          ["בוקר", "ערב", "לילה", "24 שעות"].forEach((s) => {
            [LOC_ZIRA, LOC_MATAL].forEach((loc) => {
              const slot = window.currentSchedule[d + "-" + s];
              const people =
                slot && slot[loc]
                  ? slot[loc].filter((e) => e.name).map((e) => e.name)
                  : [];
              if (people.length)
                currentLines.push(
                  "  " + d + " / " + s + " / " + loc + ": " + people.join(", "),
                );
            });
          });
        });

        const specLines = [];
        allDays.forEach((d) => {
          const specs = window.getSpecialsForDay
            ? window.getSpecialsForDay(d, window.currentSchedule)
            : [];
          specs.forEach((sp) =>
            specLines.push(
              "  " + d + ": " + sp.name + " — " + window.specStatusLabel(sp),
            ),
          );
        });

        const mode = window.isEmergencyMode
          ? "חירום (24 שעות בשתי המיקומות)"
          : window.currentSchedule.matalUnderstaff
            ? 'חוסר מת"ל (מת"ל ב-24ש, זירה רגיל)'
            : "רגיל";

        const exampleJson =
          "{\n" +
          '  "ראשון-בוקר": { "זירה": ["שם1","שם2"], "מת\\"ל": ["שם3"] },\n' +
          '  "ראשון-ערב":  { "זירה": ["שם4"], "מת\\"ל": ["שם5"] },\n' +
          '  "ראשון-לילה": { "זירה": ["שם6"], "מת\\"ל": ["שם7"] },\n' +
          '  "שישי-24 שעות": { "זירה": ["..."], "מת\\"ל": ["..."] },\n' +
          '  "שבת-24 שעות":  { "זירה": ["..."], "מת\\"ל": ["..."] }\n' +
          "}";

        return (
          "אתה מתזמן משמרות מקצועי ביחידה צבאית. בנה לוח שבועי **מלא** ומאוזן.\n\n" +
          "## מצב שבוע: " +
          mode +
          "\n\n" +
          "## עובדים פעילים והגדרותיהם:\n" +
          staffLines +
          "\n\n" +
          "## כמות נדרשת בכל משמרת (חובה למלא בדיוק):\n" +
          (ruleLines.length
            ? ruleLines.join("\n")
            : "  (לא הוגדרו חוקים — השתמש ב-2-3 אנשים למשמרת)") +
          "\n- משמרות לילה ו-24ש לא קיימות בשישי/שבת בזירה.\n\n" +
          "## דפוסי עבר (6 שבועות אחרונים) — שבץ לפי הנטיות האלה:\n" +
          (pastLines.length ? pastLines.join("\n") : "  (אין נתוני עבר)") +
          "\nמי שהיה הרבה בערב — נוח לו בערב; מי שהיה הרבה במיקום מסוים — השאר אותו שם.\n\n" +
          '## הוגנות סופ"ש (העדף את מי שסגר הכי מעט לסופ"ש הקרוב):\n' +
          (fairnessLines.length ? fairnessLines.join("\n") : "  (אין נתונים)") +
          "\n\n" +
          "## לוח נוכחי (שיבוצים נעולים — אל תשנה אותם):\n" +
          (currentLines.length ? currentLines.join("\n") : "  (ריק)") +
          "\n\n" +
          "## סטטוסים מיוחדים השבוע (אל תשבץ אותם):\n" +
          (specLines.length ? specLines.join("\n") : "  אין") +
          "\n\n" +
          "## חוקים מחייבים:\n" +
          "1. **מלא כל משמרת בדיוק לכמות הנדרשת** — אל תשאיר משמרת חסרה או חלקית.\n" +
          "2. שבץ אדם רק למשמרת שהוא **זמין** לה (לפי 'זמין ל:') ולפי האילוצים שלו.\n" +
          "3. אחרי לילה / אחרי 24ש — מנוחה למחרת (אל תשבץ).\n" +
          "4. אל תשים אדם בשתי משמרות באותו יום.\n" +
          '5. נחפף עם מיקום קבוע — לשם. טכנאי בלי "מותר ערב זירה" — לא לערב זירה.\n' +
          "6. אזן עומסים בין כל העובדים — לא אותם אנשים בכל המשמרות.\n\n" +
          "## פורמט תשובה — JSON בלבד בתוך code block:\n" +
          "```json\n" +
          exampleJson +
          "\n```\n" +
          "השתמש בדיוק בשמות מהרשימה. כלול את כל המשמרות הנדרשות, גם אם חלקן זהות."
        );
      };

      window.generateAI = async function () {
        const key = localStorage.getItem("shift_anthropic_key_v1");
        if (!key) { alert("יש להזין API key תחילה"); return; }

        const statusEl = document.getElementById("aiStatus");
        const resultEl = document.getElementById("aiResult");
        const applyBar = document.getElementById("aiApplyBar");
        statusEl.textContent = "⏳ שולח בקשה ל-Claude...";
        statusEl.style.color = "var(--md-text-secondary)";
        resultEl.style.display = "none";
        applyBar.style.display = "none";
        window._aiSuggestedSchedule = null;

        statusEl.textContent = "⏳ אוסף נתוני עבר ובונה בקשה...";
        const prompt = await window.buildAIPrompt();
        statusEl.textContent = "⏳ שולח בקשה ל-Claude...";

        try {
          const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": key,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json",
              "anthropic-dangerous-direct-browser-access": "true",
            },
            body: JSON.stringify({
              model: "claude-opus-4-8",
              max_tokens: 8192,
              messages: [{ role: "user", content: prompt }],
            }),
          });

          if (!response.ok) {
            const errData = await response.json().catch(function(){ return {}; });
            throw new Error(errData.error && errData.error.message ? errData.error.message : "HTTP " + response.status);
          }

          const data = await response.json();
          const text = data.content[0].text;

          const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
          const rawMatch = text.match(/\{[\s\S]*\}/);
          const jsonStr = codeMatch ? codeMatch[1].trim() : (rawMatch ? rawMatch[0] : null);
          if (!jsonStr) throw new Error("לא נמצא JSON בתשובה");

          const suggested = JSON.parse(jsonStr);
          window._aiSuggestedSchedule = suggested;

          const slotCount = Object.keys(suggested).length;
          const empCount = Object.values(suggested).reduce(function(acc, locs) {
            return acc + Object.values(locs).reduce(function(a, arr) { return a + (Array.isArray(arr) ? arr.length : 0); }, 0);
          }, 0);

          statusEl.textContent = "✅ קיבלנו הצעה: " + slotCount + " משמרות, " + empCount + " שיבוצים";
          statusEl.style.color = "#16a34a";
          resultEl.textContent = JSON.stringify(suggested, null, 2);
          resultEl.style.display = "block";
          applyBar.style.display = "block";

        } catch (e) {
          statusEl.textContent = "❌ שגיאה: " + e.message;
          statusEl.style.color = "#dc2626";
        }
      };

      window.applyAISchedule = function (overwrite) {
        const suggested = window._aiSuggestedSchedule;
        if (!suggested) return;

        const LOC_ZIRA = "זירה";
        const LOC_MATAL = 'מת"ל';

        Object.entries(suggested).forEach(function([slotKey, locs]) {
          if (!window.currentSchedule[slotKey]) {
            window.currentSchedule[slotKey] = {};
            window.currentSchedule[slotKey][LOC_ZIRA] = [];
            window.currentSchedule[slotKey][LOC_MATAL] = [];
          }
          Object.entries(locs).forEach(function([loc, names]) {
            if (!Array.isArray(names)) return;
            if (!window.currentSchedule[slotKey][loc]) window.currentSchedule[slotKey][loc] = [];
            if (overwrite) window.currentSchedule[slotKey][loc] = [];
            names.forEach(function(name) {
              const emp = (window.staff || []).find(function(e) { return e.name === name && e.isActive !== false; });
              if (!emp) return;
              if (!window.currentSchedule[slotKey][loc].find(function(e) { return e.id === emp.id; })) {
                window.currentSchedule[slotKey][loc].push(Object.assign({}, emp, { auto: true }));
              }
            });
          });
        });

        window.recomputeNotesFromSchedule();
        window.triggerUnsavedChanges();
        window.renderTable(window.currentSchedule, window.currentNotesLog);
        document.getElementById("aiScheduleModal").style.display = "none";
        window._aiSuggestedSchedule = null;
      };

      // ─── CSV Import ────────────────────────────────────────────────────────

      window._parsedCSVData = null;

      window.openImportModal = function () {
        document.getElementById("csvImportModal").style.display = "flex";
        document.getElementById("csvImportPreview").style.display = "none";
        document.getElementById("csvImportFileName").textContent = "";
        document.getElementById("csvImportFile").value = "";
        window._parsedCSVData = null;
      };

      window.onCSVFileSelected = function (input) {
        const file = input.files[0];
        if (!file) return;
        document.getElementById("csvImportFileName").textContent = file.name;
        const reader = new FileReader();
        reader.onload = function (e) {
          try {
            window._parsedCSVData = window.parseScheduleCSV(e.target.result);
            window.renderCSVPreview(window._parsedCSVData);
          } catch (err) {
            alert("שגיאה בקריאת הקובץ: " + err.message);
          }
        };
        reader.readAsText(file, "UTF-8");
      };

      // ─── Mode Settings (Emergency / Matal start+end dates) ─────────────────

      window._modeSettingsType = null;
      window._modeSettingsPendingActivation = false;

      window.openModeSettings = function (type, pendingActivation) {
        window._modeSettingsType = type;
        window._modeSettingsPendingActivation = !!pendingActivation;
        const modal = document.getElementById("modeSettingsModal");
        const title = document.getElementById("modeSettingsTitle");
        const note = document.getElementById("modeSettingsNote");
        const startEl = document.getElementById("modeStartDate");
        const endEl = document.getElementById("modeEndDate");
        const saveBtn = document.getElementById("modeSettingsSaveBtn");

        const hoursWrapper = document.getElementById("emergencyShiftHoursWrapper");
        const hoursInput = document.getElementById("emergencyShiftHoursInput");

        if (type === "emergency") {
          title.textContent = pendingActivation ? "🚨 הפעלת מצב חירום" : "⚙️ הגדרות מצב חירום";
          note.textContent = "תאריך ההתחלה קובע מאיזה יום מתחיל הסבב (A/B/C). אם לא הוגדר — הסבב מתחיל מיום ראשון של השבוע.";
          startEl.value = window.currentSchedule.emergencyStartDate || "";
          endEl.value = window.currentSchedule.emergencyEndDate || "";
          if (hoursWrapper) hoursWrapper.style.display = "block";
          if (hoursInput) hoursInput.value = window.currentSchedule.emergencyShiftHours || 24;
        } else {
          title.textContent = pendingActivation ? '⚠️ הפעלת מצב חוסר מת"ל' : '⚙️ הגדרות מצב חוסר מת"ל';
          note.textContent = 'תאריך ההתחלה מציין מתי עבר מת"ל למשמרת 24 שעות. תאריך הסיום מציין מתי חוזר לרגיל.';
          startEl.value = window.currentSchedule.matalUnderstaffStartDate || "";
          endEl.value = window.currentSchedule.matalUnderstaffEndDate || "";
          if (hoursWrapper) hoursWrapper.style.display = "none";
        }

        if (saveBtn) saveBtn.textContent = pendingActivation ? "הפעל" : "שמור";
        modal.style.display = "flex";
      };

      window.saveModeSettings = function () {
        const type = window._modeSettingsType;
        const pending = window._modeSettingsPendingActivation;
        const startVal = document.getElementById("modeStartDate").value;
        const endVal = document.getElementById("modeEndDate").value;

        document.getElementById("modeSettingsModal").style.display = "none";
        window._modeSettingsPendingActivation = false;

        if (pending) {
          if (type === "emergency") {
            if (!confirm("הפעלת מצב חירום תאפס את הלוח הנוכחי. להמשיך?")) return;
            window._activateEmergency(startVal, endVal);
          } else {
            window.currentSchedule.matalUnderstaff = true;
            window.currentSchedule.matalUnderstaffStartDate = startVal || null;
            window.currentSchedule.matalUnderstaffEndDate = endVal || null;
            window.initSchedule();
            window.updateMatalUnderstaffUI();
            window.triggerUnsavedChanges();
          }
        } else {
          if (type === "emergency") {
            window.currentSchedule.emergencyStartDate = startVal || null;
            window.currentSchedule.emergencyEndDate = endVal || null;
            const _sh = parseInt((document.getElementById("emergencyShiftHoursInput") || {}).value) || 24;
            window.currentSchedule.emergencyShiftHours = _sh;
          } else {
            window.currentSchedule.matalUnderstaffStartDate = startVal || null;
            window.currentSchedule.matalUnderstaffEndDate = endVal || null;
          }
          window.triggerUnsavedChanges();
        }
      };

      // ─── Draft Saving / Loading ────────────────────────────────────────────

      window.openDraftsModal = function () {
        document.getElementById("draftsModal").style.display = "flex";
        document.getElementById("draftNameInput").value = "";
        window.renderDraftsList();
      };

      window.saveDraft = function () {
        const name = (document.getElementById("draftNameInput").value || "").trim();
        if (!name) { alert("יש להזין שם לטיוטה"); return; }

        const draftId = "draft_" + Date.now();
        const draftData = {
          id: draftId,
          name: name,
          weekKey: window.currentSelectedWeek || "",
          savedAt: new Date().toISOString(),
          schedule: JSON.parse(JSON.stringify(window.currentSchedule)),
        };

        window.saveToCloud("drafts/" + draftId, draftData);
        alert("✅ הטיוטה '" + name + "' נשמרה בהצלחה");
        document.getElementById("draftNameInput").value = "";
        window.renderDraftsList();
      };

      window.renderDraftsList = function () {
        const listEl = document.getElementById("draftsList");
        listEl.innerHTML = '<p style="color:var(--md-text-secondary); font-size:0.85rem; text-align:center;">טוען...</p>';

        // Load from Firebase
        if (typeof window._draftsUnsubscribe === "function") window._draftsUnsubscribe();

        // Use a one-time get via onValue then off
        const { ref, onValue, off } = window._fbImports || {};
        if (!ref || !onValue) {
          // Fallback: try saveToCloud pattern
          listEl.innerHTML = '<p style="color:#dc2626; font-size:0.85rem;">שגיאה: Firebase לא מחובר</p>';
          return;
        }

        const db = window._firebaseDb;
        if (!db) { listEl.innerHTML = '<p style="color:#dc2626; font-size:0.85rem;">שגיאה: DB לא מחובר</p>'; return; }

        const draftsRef = ref(db, "drafts");
        const unsub = onValue(draftsRef, function (snap) {
          off(draftsRef);
          const drafts = snap.exists() ? snap.val() : {};
          const list = Object.values(drafts).sort(function(a, b) {
            return new Date(b.savedAt) - new Date(a.savedAt);
          });

          if (list.length === 0) {
            listEl.innerHTML = '<p style="color:var(--md-text-secondary); font-size:0.85rem; text-align:center;">אין טיוטות שמורות עדיין.</p>';
            return;
          }

          let html = '<div style="display:flex; flex-direction:column; gap:8px;">';
          list.forEach(function (d) {
            const date = new Date(d.savedAt).toLocaleDateString("he-IL", { day:"2-digit", month:"2-digit", year:"2-digit", hour:"2-digit", minute:"2-digit" });
            html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--md-bg); border-radius:8px; border:1px solid var(--md-divider);">';
            html += '<div><b style="font-size:0.9rem;">' + d.name + '</b><br><span style="font-size:0.75rem; color:var(--md-text-secondary);">שבוע: ' + (d.weekKey || "—") + ' | נשמר: ' + date + '</span></div>';
            html += '<div style="display:flex; gap:6px;">';
            html += '<button class="btn btn-outlined" style="font-size:0.75rem; padding:4px 10px;" onclick="window.applyDraft(\'' + d.id + '\')">טען</button>';
            html += '<button style="background:none; border:none; cursor:pointer; color:#dc2626; font-size:1rem;" onclick="window.deleteDraft(\'' + d.id + '\')" title="מחק טיוטה">✕</button>';
            html += '</div></div>';
          });
          html += '</div>';
          listEl.innerHTML = html;
        });
      };

      window.applyDraft = function (draftId) {
        const { ref, get } = window._fbImports || {};
        const db = window._firebaseDb;
        if (!ref || !get || !db) { alert("שגיאה: Firebase לא מחובר"); return; }

        if (!confirm("טעינת הטיוטה תחליף את הלוח הנוכחי. להמשיך?")) return;

        get(ref(db, "drafts/" + draftId)).then(function (snap) {
          if (!snap.exists()) { alert("הטיוטה לא נמצאה"); return; }
          const draft = snap.val();
          window.currentSchedule = draft.schedule;
          window.isEmergencyMode = window.currentSchedule.isEmergencyMode === true;
          window.currentShifts = window.isEmergencyMode ? ["24 שעות"] : ["בוקר", "ערב", "לילה"];
          window.initSchedule();
          window.recomputeNotesFromSchedule();
          window.triggerUnsavedChanges();
          window.renderTable(window.currentSchedule, window.currentNotesLog);
          document.getElementById("draftsModal").style.display = "none";
          alert("✅ הטיוטה '" + draft.name + "' נטענה בהצלחה");
        }).catch(function (e) { alert("שגיאה: " + e.message); });
      };

      window.deleteDraft = function (draftId) {
        if (!confirm("למחוק את הטיוטה לצמיתות?")) return;
        const { ref, remove } = window._fbImports || {};
        const db = window._firebaseDb;
        if (!ref || !remove || !db) { alert("שגיאה: Firebase לא מחובר"); return; }
        remove(ref(db, "drafts/" + draftId)).then(function () {
          window.renderDraftsList();
        });
      };

      // ─── CSV Import improvements: special statuses + 24h matal ─────────────

      // Override parseScheduleCSV to also handle special statuses and 24h
      window.parseScheduleCSV = function (raw) {
        var text = raw.replace(/^﻿/, "").trim();
        var lines = text.split(/\r?\n/).filter(function(l) { return l.trim(); });
        if (lines.length < 2) throw new Error("הקובץ ריק או חסר שורות נתונים");

        var dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
        var validShifts = ["בוקר", "ערב", "לילה", "24 שעות"];
        var assignments = [];
        var specials = [];
        var warnings = [];
        var unknownEmps = new Set();

        for (var i = 1; i < lines.length; i++) {
          var cols = lines[i].split(",");
          var empName = (cols[0] || "").trim();
          if (!empName) continue;

          var emp = (window.staff || []).find(function(e) { return e.name === empName && e.isActive !== false; });
          if (!emp) { unknownEmps.add(empName); continue; }

          dayNames.forEach(function(day, dIdx) {
            var shiftCol = dIdx * 2 + 1;
            var locCol = dIdx * 2 + 2;
            var shiftVal = (cols[shiftCol] || "").trim();
            var locVal = (cols[locCol] || "").trim();

            if (!shiftVal || shiftVal === "-") return;
            if (shiftVal === "מנוחה") return;

            // Check if it's a real shift
            var matchedShift = validShifts.find(function(s) { return shiftVal === s || shiftVal.startsWith(s + " ("); });
            if (matchedShift) {
              // Normalize location
              var normalizedLoc = null;
              if (locVal === "זירה") normalizedLoc = "זירה";
              else if (locVal === 'מת"ל' || locVal === "מתל" || locVal.startsWith("מת") || locVal === "200") normalizedLoc = 'מת"ל';

              if (!normalizedLoc) {
                warnings.push(empName + " / " + day + " / " + shiftVal + " — מיקום לא מוכר: '" + locVal + "'");
                return;
              }
              assignments.push({ emp: emp, day: day, shift: matchedShift, loc: normalizedLoc });
            } else {
              // Non-shift value = special status
              specials.push({ emp: emp, day: day, status: shiftVal });
            }
          });
        }

        unknownEmps.forEach(function(n) { warnings.push("עובד לא נמצא: " + n); });
        return { assignments: assignments, specials: specials, warnings: warnings };
      };

      // Override applyCSVImport to also apply special statuses
      window.applyCSVImport = function (overwrite) {
        var parsed = window._parsedCSVData;
        if (!parsed) { alert("אין נתונים לייבוא"); return; }

        var LOC_ZIRA = "זירה";
        var LOC_MATAL = 'מת"ל';
        var dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
        var allShifts = ["בוקר", "ערב", "לילה", "24 שעות"];

        if (overwrite) {
          dayNames.forEach(function(d) {
            allShifts.forEach(function(s) {
              var key = d + "-" + s;
              if (window.currentSchedule[key]) {
                window.currentSchedule[key][LOC_ZIRA] = [];
                window.currentSchedule[key][LOC_MATAL] = [];
              }
            });
            // Clear specials for this day
            if (window.currentSchedule.special) window.currentSchedule.special[d] = [];
          });
        }

        // Apply shift assignments
        (parsed.assignments || []).forEach(function(a) {
          var key = a.day + "-" + a.shift;
          if (!window.currentSchedule[key]) {
            var obj = {};
            obj[LOC_ZIRA] = [];
            obj[LOC_MATAL] = [];
            window.currentSchedule[key] = obj;
          }
          if (!window.currentSchedule[key][a.loc]) window.currentSchedule[key][a.loc] = [];
          if (!window.currentSchedule[key][a.loc].find(function(e) { return e.id === a.emp.id; })) {
            window.currentSchedule[key][a.loc].push(Object.assign({}, a.emp, { auto: true }));
          }
        });

        // Apply special statuses to currentSchedule.special
        if (!window.currentSchedule.special) window.currentSchedule.special = {};
        (parsed.specials || []).forEach(function(sp) {
          var day = sp.day;
          if (!window.currentSchedule.special[day]) window.currentSchedule.special[day] = [];
          var existing = window.currentSchedule.special[day].find(function(e) { return e.id === sp.emp.id; });
          if (!existing) {
            window.currentSchedule.special[day].push({ id: sp.emp.id, name: sp.emp.name, status: sp.status });
          }
        });

        window.recomputeNotesFromSchedule();
        window.triggerUnsavedChanges();
        document.getElementById("csvImportModal").style.display = "none";
        window._parsedCSVData = null;
        try { window.renderTable(window.currentSchedule, window.currentNotesLog); } catch(e) { console.error("renderTable error after CSV import:", e); }

        var assignCount = (parsed.assignments || []).length;
        var specCount = (parsed.specials || []).length;
        var msg = (overwrite ? "הלוח הוחלף" : "יובאו") + ": " + assignCount + " שיבוצים";
        if (specCount > 0) msg += " + " + specCount + " סטטוסים מיוחדים";
        setTimeout(function() { alert("✅ " + msg); }, 100);
      };

      window.renderCSVPreview = function (parsed) {
        const statsEl = document.getElementById("csvImportStats");
        const warnEl = document.getElementById("csvImportWarnings");
        const previewEl = document.getElementById("csvImportPreviewText");
        const previewContainer = document.getElementById("csvImportPreview");

        statsEl.textContent =
          "זוהו " + parsed.assignments.length + " שיבוצים מתוך הקובץ.";
        // הצגת מספר הסטטוסים המיוחדים שזוהו
        const specCount = (parsed.specials || []).length;
        if (specCount > 0)
          statsEl.textContent += " + " + specCount + " סטטוסים מיוחדים";

        if (parsed.warnings.length > 0) {
          warnEl.style.display = "block";
          warnEl.innerHTML =
            "<b>⚠️ אזהרות:</b><br>" + parsed.warnings.join("<br>");
        } else {
          warnEl.style.display = "none";
        }

        // קיבוץ לפי יום לתצוגה מקדימה
        const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
        const byDay = {};
        parsed.assignments.forEach(function (a) {
          if (!byDay[a.day]) byDay[a.day] = [];
          byDay[a.day].push(a.shift + " / " + a.loc + ": " + a.emp.name);
        });

        let preview = "";
        days.forEach(function (d) {
          if (byDay[d] && byDay[d].length) {
            preview += d + ":\n  " + byDay[d].join("\n  ") + "\n";
          }
        });
        previewEl.textContent = preview || "(אין שיבוצים לייבא)";
        previewContainer.style.display = "block";
      };

      window.setEmergencyShiftHours = function (h) {
        const el = document.getElementById("emergencyShiftHoursInput");
        if (el) el.value = h;
      };

      // ─── Day Mode per-day computation helper ──────────────────────────────────

      window.getDayModeRT = function (dayIdx, weekSun, sched) {
        const s = sched || window.currentSchedule;
        const d = new Date(weekSun);
        d.setDate(d.getDate() + dayIdx);
        const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
        if (window.isEmergencyMode) {
          const start = s && s.emergencyStartDate, end = s && s.emergencyEndDate;
          if ((!start || key >= start) && (!end || key <= end)) return 'emergency';
        }
        if (s && s.matalUnderstaff) {
          const start = s.matalUnderstaffStartDate, end = s.matalUnderstaffEndDate;
          if ((!start || key >= start) && (!end || key <= end)) return 'matal';
        }
        return 'normal';
      };

      // ─── Day Highlight (click column header to cycle color) ──────────────────

      window.toggleDayHighlight = function (day) {
        if (!window.currentSchedule.dayHighlights) window.currentSchedule.dayHighlights = {};
        const colors = [null, '#eab308', '#f97316', '#ef4444', '#22c55e', '#3b82f6'];
        const curr = window.currentSchedule.dayHighlights[day] || null;
        const idx = colors.indexOf(curr);
        const next = colors[(idx + 1) % colors.length];
        if (next === null) delete window.currentSchedule.dayHighlights[day];
        else window.currentSchedule.dayHighlights[day] = next;
        window.triggerUnsavedChanges();
        window.renderTable(window.currentSchedule, window.currentNotesLog);
      };
