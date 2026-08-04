# 증강(Augments) 도감 설명서

이 문서는 요트 다이스의 게임 진행 중 획득할 수 있는 증강(Augments)들의 효과를 플레이어가 직관적으로 이해할 수 있도록 간결하게 정리한 문서입니다. 추후 게임 내 증강 설명란 표시 및 증강 도감 JSON 데이터를 가공하기 위한 기준으로 사용됩니다.

---

## 📌 1. 변형 (Modification)
특정 족보 하나를 완전히 다른 족보나 강화된 규칙으로 교체합니다.

### 상단 구역 (Upper Section)

*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><path d="M 12 12 C 9.5 9 7.5 6.2 9.5 4.2 C 11.2 2.5 12 5.2 12 5.2 C 12 5.2 12.8 2.5 14.5 4.2 C 16.5 6.2 14.5 9 12 12 Z" fill="none" stroke="#222" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><g transform="rotate(90 12 12)"><path d="M 12 12 C 9.5 9 7.5 6.2 9.5 4.2 C 11.2 2.5 12 5.2 12 5.2 C 12 5.2 12.8 2.5 14.5 4.2 C 16.5 6.2 14.5 9 12 12 Z" fill="none" stroke="#222" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></g><g transform="rotate(180 12 12)"><path d="M 12 12 C 9.5 9 7.5 6.2 9.5 4.2 C 11.2 2.5 12 5.2 12 5.2 C 12 5.2 12.8 2.5 14.5 4.2 C 16.5 6.2 14.5 9 12 12 Z" fill="none" stroke="#222" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></g><g transform="rotate(270 12 12)"><path d="M 12 12 C 9.5 9 7.5 6.2 9.5 4.2 C 11.2 2.5 12 5.2 12 5.2 C 12 5.2 12.8 2.5 14.5 4.2 C 16.5 6.2 14.5 9 12 12 Z" fill="none" stroke="#222" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></g></svg> 1. 럭키 세븐 (Lucky Sevens)**
    *   **대상:** 에이스 (Aces)
    *   **족보 표기:** L. Sevens
    *   **조건:** 주사위 눈금 총합이 7, 17, 27 중 하나일 때 기입 가능
    *   **효과:** 고정 15점 획득 (단, 상단 63점 보너스 계산에서 제외)
    *   **텍스트:** 에이스 족보를 럭키 세븐 족보로 변경합니다. 주사위 눈금 총합이 7, 17, 27 중 하나일 때 기입이 가능하며, 족보의 조건을 만족하면 고정 15점을 얻을 수 있습니다. (단, 획득한 점수는 상단 보너스 계산에서 제외됩니다.)
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"> <rect x="5" y="5" width="6" height="6" fill="#222"/> <rect x="13" y="13" width="6" height="6" fill="#222"/> <rect x="5" y="13" width="6" height="6" fill="none" stroke="#222" stroke-width="1.5"/> <rect x="13" y="5" width="6" height="6" fill="none" stroke="#222" stroke-width="1.5"/> </svg> 2. 퍼펙트 스퀘어 (Perfect Squares)**
    *   **대상:** 에이스 (Aces)
    *   **족보 표기:** P. Squares
    *   **조건:** 주사위 눈금 총합이 9, 16, 25 중 하나일 때 기입 가능
    *   **효과:** 고정 12점 획득 (단, 상단 63점 보너스 계산에서 제외)
    *   **텍스트:** 에이스 족보를 퍼펙트 스퀘어 족보로 변경합니다. 주사위 눈금 총합이 9, 16, 25 중 하나일 때 기입이 가능하며, 족보의 조건을 만족하면 고정 12점을 얻을 수 있습니다. (단, 획득한 점수는 상단 보너스 계산에서 제외됩니다.)
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><path fill-rule="evenodd" d="M6 2 h12 a4 4 0 0 1 4 4 v12 a4 4 0 0 1 -4 4 h-12 a4 4 0 0 1 -4 -4 v-12 a4 4 0 0 1 4 -4 Z M 17 5 A 2 2 0 1 0 17 9 A 2 2 0 1 0 17 5 Z M 7 15 A 2 2 0 1 0 7 19 A 2 2 0 1 0 7 15 Z" fill="#222"/></svg> 3. 안티-에이스 듀스 (Anti-Ace Deuces)**
    *   **대상:** 듀스 (Deuces)
    *   **족보 표기:** -1. Deuces
    *   **조건:** '2'가 3개 이상이면서, '1'이 단 하나도 없을 때 기입 가능
    *   **효과:** 고정 8점 획득
    *   **텍스트:** 듀스 족보를 안티-에이스 듀스 족보로 변경합니다. '2'가 3개 이상이면서 '1'이 단 하나도 없을 때 기입이 가능하며, 족보의 조건을 만족하면 고정 8점을 얻을 수 있습니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><path fill-rule="evenodd" d="M6 2 h12 a4 4 0 0 1 4 4 v12 a4 4 0 0 1 -4 4 h-12 a4 4 0 0 1 -4 -4 v-12 a4 4 0 0 1 4 -4 Z M 17 5 A 2 2 0 1 0 17 9 A 2 2 0 1 0 17 5 Z M 12 10 A 2 2 0 1 0 12 14 A 2 2 0 1 0 12 10 Z M 7 15 A 2 2 0 1 0 7 19 A 2 2 0 1 0 7 15 Z" fill="#222"/></svg> 4. 안티-포 트리플 (Anti-Four Threes)**
    *   **대상:** 트리플 (Threes)
    *   **족보 표기:** -4. Threes
    *   **조건:** '3'이 3개 이상이면서, '4'가 단 하나도 없을 때 기입 가능
    *   **효과:** 고정 12점 획득
    *   **텍스트:** 트리플 족보를 안티-포 트리플 족보로 변경합니다. '3'이 3개 이상이면서 '4'가 단 하나도 없을 때 기입이 가능하며, 족보의 조건을 만족하면 고정 12점을 얻을 수 있습니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"> <path d="M12 2 L20 12 L12 22 L4 12 Z" fill="none" stroke="#222" stroke-width="2.5" stroke-linejoin="round"/> <circle cx="12" cy="12" r="2.5" fill="#222"/> </svg> 5. 프라임 넘버즈 (Prime Numbers)**
    *   **대상:** 트리플 (Threes)
    *   **족보 표기:** P. Numbers
    *   **조건:** 주사위 5개가 모두 소수(2, 3, 5, 7)일 때 기입 가능
    *   **효과:** 고정 12점 획득
    *   **텍스트:** 트리플 족보를 프라임 넘버즈 족보로 변경합니다. 주사위 5개가 모두 소수(2, 3, 5, 7)일 때 기입이 가능하며, 족보의 조건을 만족하면 고정 12점을 얻을 수 있습니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><path fill-rule="evenodd" d="M6 2 h12 a4 4 0 0 1 4 4 v12 a4 4 0 0 1 -4 4 h-12 a4 4 0 0 1 -4 -4 v-12 a4 4 0 0 1 4 -4 Z M 7 5 A 2 2 0 1 0 7 9 A 2 2 0 1 0 7 5 Z M 17 5 A 2 2 0 1 0 17 9 A 2 2 0 1 0 17 5 Z M 7 15 A 2 2 0 1 0 7 19 A 2 2 0 1 0 7 15 Z M 17 15 A 2 2 0 1 0 17 19 A 2 2 0 1 0 17 15 Z" fill="#222"/></svg> 6. 안티-식스 쿼드 (Anti-Six Fours)**
    *   **대상:** 쿼드 (Fours)
    *   **족보 표기:** -6. Fours
    *   **조건:** '4'가 3개 이상이면서, '6'이 단 하나도 없을 때 기입 가능
    *   **효과:** 고정 16점 획득
    *   **텍스트:** 쿼드 족보를 안티-식스 쿼드 족보로 변경합니다. '4'가 3개 이상이면서 '6'이 단 하나도 없을 때 기입이 가능하며, 족보의 조건을 만족하면 고정 16점을 얻을 수 있습니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><path fill-rule="evenodd" d="M6 2 h12 a4 4 0 0 1 4 4 v12 a4 4 0 0 1 -4 4 h-12 a4 4 0 0 1 -4 -4 v-12 a4 4 0 0 1 4 -4 Z M 7 5 A 2 2 0 1 0 7 9 A 2 2 0 1 0 7 5 Z M 17 5 A 2 2 0 1 0 17 9 A 2 2 0 1 0 17 5 Z M 12 10 A 2 2 0 1 0 12 14 A 2 2 0 1 0 12 10 Z M 7 15 A 2 2 0 1 0 7 19 A 2 2 0 1 0 7 15 Z M 17 15 A 2 2 0 1 0 17 19 A 2 2 0 1 0 17 15 Z" fill="#222"/></svg> 7. 안티-식스 펜타 (Anti-Six Fives)**
    *   **대상:** 펜타 (Fives)
    *   **족보 표기:** -6. Fives
    *   **조건:** '5'가 3개 이상이면서, '6'이 단 하나도 없을 때 기입 가능
    *   **효과:** 고정 20점 획득
    *   **텍스트:** 펜타 족보를 안티-식스 펜타 족보로 변경합니다. '5'가 3개 이상이면서 '6'이 단 하나도 없을 때 기입이 가능하며, 족보의 조건을 만족하면 고정 20점을 얻을 수 있습니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><path fill-rule="evenodd" d="M6 2 h12 a4 4 0 0 1 4 4 v12 a4 4 0 0 1 -4 4 h-12 a4 4 0 0 1 -4 -4 v-12 a4 4 0 0 1 4 -4 Z M 7 5 A 2 2 0 1 0 7 9 A 2 2 0 1 0 7 5 Z M 17 5 A 2 2 0 1 0 17 9 A 2 2 0 1 0 17 5 Z M 7 10 A 2 2 0 1 0 7 14 A 2 2 0 1 0 7 10 Z M 17 10 A 2 2 0 1 0 17 14 A 2 2 0 1 0 17 10 Z M 7 15 A 2 2 0 1 0 7 19 A 2 2 0 1 0 7 15 Z M 17 15 A 2 2 0 1 0 17 19 A 2 2 0 1 0 17 15 Z" fill="#222"/></svg> 8. 안티-파이브 헥사 (Anti-Five Sixes)**
    *   **대상:** 헥사 (Sixes)
    *   **족보 표기:** -5. Sixes
    *   **조건:** '6'이 3개 이상이면서, '5'가 단 하나도 없을 때 기입 가능
    *   **효과:** 고정 24점 획득
    *   **텍스트:** 헥사 족보를 안티-파이브 헥사 족보로 변경합니다. '6'이 3개 이상이면서 '5'가 단 하나도 없을 때 기입이 가능하며, 족보의 조건을 만족하면 고정 24점을 얻을 수 있습니다.

### 하단 구역 (Lower Section)

*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><path d="M 10 3.5 C 7.5 4 6 5.5 6 9 C 8 8 10 7.5 12 8 C 10.5 10.5 5 11 2.5 12.5 C 6 11 14 10.5 21.5 12.5 C 19 10.5 16.5 9.5 16.5 7 C 17.5 5.5 15.5 3 12.5 3 C 11.5 3 10.5 3.2 10 3.5 Z M 7.5 13.5 C 7 15 7.5 16.5 9.5 15.5 C 12 14.5 15.5 15 18.5 16.5 C 18 14.5 16 13.5 14.5 14 Z M 5.5 17 L 7.5 21 C 12 18.5 16.5 19 21.5 20.5 C 20.5 17 17.5 15 14.5 14 Z" fill="#222"/></svg> 9. 갬블러 (Gambler)**
    *   **대상:** 초이스 (Choice)
    *   **족보 표기:** Gambler
    *   **조건:** 주사위 눈금 총합이 24 이상일 때 기입 가능 (24 미만 기입 시 0점)
    *   **효과:** 달성 시 [ 주사위 눈금 총합 + 7점 ] 획득
    *   **텍스트:** 초이스 족보를 갬블러 족보로 변경합니다. 주사위 눈금 총합이 24 이상일 때 기입이 가능하며, 족보의 조건을 만족하면 [ 주사위 눈금 총합 + 7 ] 점을 얻을 수 있습니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"> <rect x="10" y="3" width="4" height="4" rx="0.5" fill="#222"/> <rect x="5" y="14" width="4" height="4" rx="0.5" fill="#222"/> <rect x="15" y="14" width="4" height="4" rx="0.5" fill="#222"/> </svg> 10. 쓰리 오브 어 카인드 (Three of a Kind)**
    *   **대상:** 포카인드 (Four of a Kind)
    *   **족보 표기:** 3 of a Kind
    *   **조건:** 같은 눈금이 3개 이상일 때 기입 가능
    *   **효과:** 달성 시 [ 주사위 눈금 총합 - 2점 ] 획득
    *   **텍스트:** 포카인드 족보를 쓰리 오브 어 카인드 족보로 변경합니다. 같은 눈금이 3개 이상일 때 기입이 가능하며, 족보의 조건을 만족하면 [ 주사위 눈금 총합 - 2 ] 점을 얻을 수 있습니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><rect x="4" y="4" width="7" height="7" fill="#222"/><rect x="13" y="4" width="7" height="7" fill="#222"/><rect x="4" y="13" width="7" height="7" fill="#222"/><rect x="13" y="13" width="7" height="7" fill="#222"/></svg> 11. 포 바이 포 (Four by Four)**
    *   **대상:** 포카인드 (Four of a Kind)
    *   **족보 표기:** Four x Four
    *   **조건:** '4'를 4개 이상 모아 포카인드 달성 시 추가 보상 (다른 숫자로 달성 시 페널티)
    *   **효과:** 4로 달성 시 총합 +10점 / 다른 숫자로 달성 시 총합 -4점
    *   **텍스트:** 포카인드 족보를 포 바이 포 족보로 변경합니다. '4'를 4개 이상 모아 포카인드를 달성하면 [ 주사위 눈금 총합 + 10 ] 점을 얻을 수 있습니다. (다른 숫자로 달성 시 총합 - 4점 적용)
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><path d="M 3 11 L 12 3 L 21 11 M 5.5 9.5 V 20.5 H 18.5 V 9.5" fill="none" stroke="#222" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 9.5 20.5 V 15 A 1.5 1.5 0 0 1 11 13.5 H 13 A 1.5 1.5 0 0 1 14.5 15 V 20.5" fill="none" stroke="#222" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> 12. 타이니 하우스 (Tiny House)**
    *   **대상:** 풀하우스 (Full House)
    *   **족보 표기:** Tiny House
    *   **조건:** '5'와 '6'을 제외한 눈금만으로 풀하우스 달성
    *   **효과:** 고정 28점 획득
    *   **텍스트:** 풀하우스 족보를 타이니 하우스 족보로 변경합니다. '5'와 '6'을 제외한 눈금만으로 족보의 조건을 만족하면 고정 28점을 얻을 수 있습니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"> <rect x="4" y="5" width="5" height="5" rx="0.5" fill="#222"/> <rect x="4" y="14" width="5" height="5" rx="0.5" fill="#222"/> <rect x="15" y="5" width="5" height="5" rx="0.5" fill="none" stroke="#222" stroke-width="1.5"/> <rect x="15" y="14" width="5" height="5" rx="0.5" fill="none" stroke="#222" stroke-width="1.5"/> </svg> 13. 투 페어 (Two Pair)**
    *   **대상:** 풀하우스 (Full House)
    *   **족보 표기:** Two Pair
    *   **조건:** 서로 다른 2쌍의 숫자가 각각 2개 이상일 때 기입 가능
    *   **효과:** 고정 15점 획득
    *   **텍스트:** 풀하우스 족보를 투 페어 족보로 변경합니다. 서로 다른 2쌍의 숫자가 각각 2개 이상일 때 기입이 가능하며, 족보의 조건을 만족하면 고정 15점을 얻을 수 있습니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"> <rect x="7" y="3" width="4" height="6" rx="0.5" fill="#222" /> <rect x="13" y="3" width="4" height="6" rx="0.5" fill="#222" /> <rect x="4" y="13" width="4" height="6" rx="0.5" fill="none" stroke="#222" stroke-width="1.5" /> <rect x="10" y="13" width="4" height="6" rx="0.5" fill="none" stroke="#222" stroke-width="1.5" /> <rect x="16" y="13" width="4" height="6" rx="0.5" fill="none" stroke="#222" stroke-width="1.5" /> </svg> 14. 머리와 몸통 (Head & Tail)**
    *   **대상:** 풀하우스 (Full House)
    *   **족보 표기:** Head & Run
    *   **조건:** 연속된 눈금 3개(몸통) + 같은 눈금 2개(머리) 구성 시 기입 가능
    *   **효과:** 달성 시 [ 주사위 눈금 총합 + 10점 ] 획득
    *   **텍스트:** 풀하우스 족보를 머리와 몸통 족보로 변경합니다. 연속된 눈금 3개와 같은 눈금 2개를 구성할 때 기입이 가능하며, 족보의 조건을 만족하면 [ 주사위 눈금 총합 + 10 ] 점을 얻을 수 있습니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"> <circle cx="8" cy="5" r="2" fill="#222"/> <circle cx="16" cy="5" r="2" fill="#222"/> <circle cx="8" cy="12" r="2" fill="#222"/> <circle cx="16" cy="12" r="2" fill="#222"/> <circle cx="8" cy="19" r="2" fill="#222"/> <circle cx="16" cy="19" r="2" fill="#222"/> </svg> 15. 에번스 (Evens)**
    *   **대상:** 스몰 스트레이트 (Small Straight)
    *   **족보 표기:** Evens
    *   **조건:** 주사위 5개가 모두 짝수(2, 4, 6)일 때 기입 가능
    *   **효과:** 고정 20점 획득
    *   **텍스트:** 스몰 스트레이트 족보를 에번스 족보로 변경합니다. 주사위 5개가 모두 짝수(2, 4, 6)일 때 기입이 가능하며, 족보의 조건을 만족하면 고정 20점을 얻을 수 있습니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"> <circle cx="12" cy="12" r="2.5" fill="#222"/> <circle cx="5" cy="5" r="2.5" fill="none" stroke="#222" stroke-width="1.5"/> <circle cx="19" cy="19" r="2.5" fill="none" stroke="#222" stroke-width="1.5"/> </svg> 16. 오즈 (Odds)**
    *   **대상:** 스몰 스트레이트 (Small Straight)
    *   **족보 표기:** Odds
    *   **조건:** 주사위 5개가 모두 홀수(1, 3, 5)일 때 기입 가능
    *   **효과:** 고정 20점 획득
    *   **텍스트:** 스몰 스트레이트 족보를 오즈 족보로 변경합니다. 주사위 5개가 모두 홀수(1, 3, 5)일 때 기입이 가능하며, 족보의 조건을 만족하면 고정 20점을 얻을 수 있습니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"> <path d="M3 21 v-4 h4 v-4 h4 v-4 h4 v-4 h4" stroke="#222" stroke-width="2" fill="none" stroke-linejoin="round"/> <path d="M8 21 v-4 h4 v-4 h4 v-4 h4" stroke="#222" stroke-width="2" fill="none" stroke-linejoin="round"/> </svg> 17. 더블 라지 스트레이트 (Double Large Straight)**
    *   **대상:** 스몰 스트레이트 (Small Straight)
    *   **족보 표기:** L. Straight
    *   **조건:** 라지 스트레이트 조건으로 변경 (달성 시 30점 획득)
    *   **효과:** 상단 63점 보너스 달성 허들을 60점(-3점)으로 영구 완화
    *   **텍스트:** 스몰 스트레이트 족보를 라지 스트레이트 족보로 변경하고, 상단 구역 보너스 달성 조건을 60점으로 낮춥니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><path d="M12 2 L15 5 L12 8 L9 5 Z" fill="#222"/><path d="M7 11 L10 14 L7 17 L4 14 Z" fill="#222"/><path d="M17 11 L20 14 L17 17 L14 14 Z" fill="#222"/></svg> 18. 프라임 컬렉션 (Prime Collection)**
    *   **대상:** 라지 스트레이트 (Large Straight)
    *   **족보 표기:** P. Collection
    *   **조건:** 모든 눈금이 소수(2, 3, 5)이며, 2, 3, 5가 최소 1개씩 포함될 때 기입 가능
    *   **효과:** 고정 35점 획득
    *   **텍스트:** 라지 스트레이트 족보를 프라임 컬렉션 족보로 변경합니다. 모든 눈금이 소수(2, 3, 5)이고 종류별로 최소 1개 이상 포함될 때 기입이 가능하며, 족보의 조건을 만족하면 고정 35점을 얻을 수 있습니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><path d="M 2 11 L 7.5 5.5 L 13 11 M 4 9.5 V 20.5 H 11 V 9.5" fill="none" stroke="#222" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M 6.5 20.5 V 16.5 A 1 1 0 0 1 7.5 15.5 H 8.5 A 1 1 0 0 1 9.5 16.5 V 20.5" fill="none" stroke="#222" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M 11 11 L 16.5 5.5 L 22 11 M 13 V 20.5 H 20 V 9.5" fill="none" stroke="#222" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M 15.5 20.5 V 16.5 A 1 1 0 0 1 16.5 15.5 H 17.5 A 1 1 0 0 1 18.5 16.5 V 20.5" fill="none" stroke="#222" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> 19. 땅콩주택 (Duplex House)**
    *   **대상:** 라지 스트레이트 (Large Straight)
    *   **족보 표기:** D. House
    *   **조건:** 정확히 1차이 나는 두 개의 숫자로만 이루어진 풀하우스일 때 기입 가능 (예: 2-3, 4-5)
    *   **효과:** 고정 35점 획득
    *   **텍스트:** 라지 스트레이트 족보를 땅콩주택 족보로 변경합니다. 정확히 1차이 나는 두 개의 숫자로만 이루어진 풀하우스를 달성할 때 기입이 가능하며, 족보의 조건을 만족하면 고정 35점을 얻을 수 있습니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"> <path d="M3 18 L12 5 L21 18 Z" fill="none" stroke="#222" stroke-width="2.5" stroke-linejoin="round"/> <path d="M8 12 L12 16 L16 12" fill="none" stroke="#222" stroke-width="2" stroke-linejoin="round"/> </svg> 20. 마운틴 (Mountain)**
    *   **대상:** 라지 스트레이트 (Large Straight)
    *   **족보 표기:** Mountain
    *   **조건:** [2, 3, 4, 5, 6] 달성 시 기입 가능
    *   **효과:** 고정 40점 획득
    *   **텍스트:** 라지 스트레이트 족보를 마운틴 족보로 변경합니다. [2, 3, 4, 5, 6]을 달성할 때 기입이 가능하며, 족보의 조건을 만족하면 고정 40점을 얻을 수 있습니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><rect x="4" y="14" width="4" height="6" fill="#222"/><rect x="10" y="10" width="4" height="10" fill="#222"/><rect x="16" y="4" width="4" height="16" fill="#222"/></svg> 21. 하이 다이스 (High Dice)**
    *   **대상:** 라지 스트레이트 (Large Straight)
    *   **족보 표기:** High Dice
    *   **조건:** 모든 주사위가 4, 5, 6, 7이고 총합이 26 이상일 때 기입 가능
    *   **효과:** 고정 35점 획득
    *   **텍스트:** 라지 스트레이트 족보를 하이 다이스 족보로 변경합니다. 모든 주사위가 4, 5, 6, 7이고 총합이 26 이상일 때 기입이 가능하며, 족보의 조건을 만족하면 고정 35점을 얻을 수 있습니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"> <path d="M18 18 V10 C18 5, 6 5, 6 10 V18 M2 14 L6 18 L10 14" stroke="#222" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/> </svg> 22. 두 번째 초이스 (Whatever it takes...)**
    *   **대상:** 요트 (Yacht)
    *   **족보 표기:** 2nd Choice
    *   **조건:** 초이스처럼 조건 없이 기입 가능
    *   **효과:** 주사위 눈금 총합의 절반 획득 (소수점 버림)
    *   **텍스트:** 요트 족보를 두 번째 초이스 족보로 변경합니다. 조건 없이 언제든 기입이 가능하며, 주사위 눈금 총합의 절반에 해당하는 점수를 얻을 수 있습니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"> <rect x="2.5" y="5.5" width="13" height="13" fill="none" stroke="#222" stroke-width="0.5"/> <rect x="15.5" y="5.5" width="8" height="8" fill="none" stroke="#222" stroke-width="0.5"/> <rect x="18.5" y="13.5" width="5" height="5" fill="none" stroke="#222" stroke-width="0.5"/> <rect x="15.5" y="15.5" width="3" height="3" fill="none" stroke="#222" stroke-width="0.5"/> <rect x="15.5" y="13.5" width="2" height="2" fill="none" stroke="#222" stroke-width="0.5"/> <rect x="17.5" y="13.5" width="1" height="1" fill="none" stroke="#222" stroke-width="0.5"/> <rect x="17.5" y="14.5" width="1" height="1" fill="none" stroke="#222" stroke-width="0.5"/> <path d="M 18.5 14.5 A 1 1 0 0 0 17.5 13.5 A 2 2 0 0 0 15.5 15.5 A 3 3 0 0 0 18.5 18.5 A 5 5 0 0 0 23.5 13.5 A 8 8 0 0 0 15.5 5.5 A 13 13 0 0 0 2.5 18.5" fill="none" stroke="#222" stroke-width="1.5" stroke-linecap="round"/> </svg> 23. 피보나치 넘버즈 (Fibonacci Numbers)**
    *   **대상:** 요트 (Yacht)
    *   **족보 표기:** Fib. Numbers
    *   **조건:** [1, 1, 2, 3, 5] 달성 시 기입 가능
    *   **효과:** 고정 25점 획득
    *   **텍스트:** 요트 족보를 피보나치 넘버즈 족보로 변경합니다. [1, 1, 2, 3, 5]를 구성할 때 기입이 가능하며, 족보의 조건을 만족하면 고정 25점을 얻을 수 있습니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><path fill-rule="evenodd" d="M6 2 h12 a4 4 0 0 1 4 4 v12 a4 4 0 0 1 -4 4 h-12 a4 4 0 0 1 -4 -4 v-12 a4 4 0 0 1 4 -4 Z M10 4 h4 v4 h-4 Z M10 16 h4 v4 h-4 Z M4 10 h4 v4 h-4 Z M16 10 h4 v4 h-4 Z M10 10 h4 v4 h-4 Z" fill="#222"/></svg> 24. 리버스 초이스 (Reverse Choice)**
    *   **대상:** 요트 (Yacht)
    *   **족보 표기:** R. Choice
    *   **조건:** 초이스처럼 조건 없이 기입 가능
    *   **효과:** 달성 시 [ 30 - 주사위 눈금 총합 ] 점수 획득
    *   **텍스트:** 요트 족보를 리버스 초이스 족보로 변경합니다. 조건 없이 언제든 기입이 가능하며, 30점에서 주사위 눈금 총합을 뺀 점수를 얻을 수 있습니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"> <path d="M12 3 L3 9 h18 Z" fill="#222" stroke-linejoin="round"/> <rect x="4" y="10" width="2" height="8" fill="#222"/> <rect x="11" y="10" width="2" height="8" fill="#222"/> <rect x="18" y="10" width="2" height="8" fill="#222"/> <rect x="2" y="19" width="20" height="2" fill="#222"/> </svg> 25. 요트 뱅크 (Yacht Bank)**
    *   **대상:** 요트 (Yacht)
    *   **족보 표기:** Bank
    *   **조건/효과:** 증강 획득 후 3턴 동안, 턴 종료 시 킵 존에 남아있는 주사위 눈금의 총합만큼 뱅크 점수 누적(최대 15점). 킵 존의 주사위는 족보 점수 계산에서 제외됨. 4번째 턴 시작 시 뱅크 누적 점수 자동 기입.
    *   **텍스트:** 요트 족보를 요트 뱅크 족보로 변경합니다. 증강 획득 후 3턴 동안, 턴 종료 시 킵 존에 남아있는 주사위 눈금의 총합만큼 뱅크 점수가 누적됩니다. (최대 15점) 단, 킵 존의 주사위는 해당 턴 족보 점수 계산에서 제외됩니다. 4번째 턴 시작 시 뱅크에 누적된 점수가 요트 뱅크 족보에 자동 기입됩니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"> <circle cx="12" cy="12" r="10" fill="none" stroke="#222" stroke-width="1.5"/> <circle cx="12" cy="12" r="8" fill="none" stroke="#222" stroke-width="4" stroke-dasharray="3.1416 3.1416"/> <circle cx="12" cy="12" r="6" fill="none" stroke="#222" stroke-width="1.5"/> </svg> 26. 블랙잭 21 (Blackjack 21)**
    *   **대상:** 요트 (Yacht)
    *   **족보 표기:** Blackjack
    *   **조건:** 주사위 눈금 총합이 정확히 21일 때 기입 가능 (아닐 경우 0점)
    *   **효과:** 달성 시 고정 21점 획득
    *   **텍스트:** 요트 족보를 블랙잭 21 족보로 변경합니다. 주사위 눈금 총합이 정확히 21일 때 기입이 가능하며, 족보의 조건을 만족하면 고정 21점을 얻을 수 있습니다.

---

## 📌 2. 퀘스트 (Quest)
특정 조건을 달성하면 영구적인 보너스 점수나 스탯 혜택을 제공합니다. (주로 1페이즈 등장)

*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><path d="M13 2 L3 14 h9 l-2 8 l10-12 h-9 z" fill="#222" stroke-linejoin="round"/></svg> 27. 재빠른 스트레이트 (Fast Straight)**
    *   **조건:** 2페이즈 종료 전(8라운드 이내)에 스몰/라지 스트레이트 모두 기입
    *   **보상:** 보너스 +15점 획득
    *   **텍스트:** 퀘스트: 8턴 이내에 스몰 스트레이트와 라지 스트레이트를 모두 족보에 기입합니다. 퀘스트 완료 시, 보너스 15점을 획득합니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><circle cx="12" cy="13" r="8" fill="none" stroke="#222" stroke-width="2"/><path d="M12 5 v-3 M9 2 h6 M12 13 l3 -3" stroke="#222" stroke-width="2" stroke-linecap="round"/></svg> 28. 낭비할 시간 없다 (No time to waste)**
    *   **조건:** 획득 후 연속된 다음 3턴 동안 리롤 없이 첫 굴림만으로 족보 기입
    *   **실패:** 대상 3턴 중 한 번이라도 리롤한 뒤 기입하면 퀘스트 실패
    *   **보상:** 3턴 연속 성공 시 보너스 +15점 획득
    *   **텍스트:** 퀘스트: 연속된 다음 3턴 동안 리롤 없이 바로 족보를 기입합니다. 퀘스트 완료 시, 보너스 15점을 획득합니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><path d="M4 20 v-5 h5 v-5 h5 v-5 h5" stroke="#222" stroke-width="2.5" fill="none" stroke-linejoin="round"/></svg> 29. 차근차근 (Step by Step)**
    *   **조건:** 상단 구역(Aces ~ Sixes) 족보를 무조건 위에서부터 아래로 순서대로 기입
    *   **보상:** Sixes 완료 즉시, 상단 보너스 점수가 +35점에서 +55점으로 영구 강화
    *   **텍스트:** 퀘스트: 상단 구역(Aces부터 Sixes까지)을 위에서부터 순서대로 기입해야 합니다. 성공적으로 모두 기입하면 상단 보너스가 55점으로 강화됩니다. (순서를 어길 시 퀘스트 실패)
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><rect x="3.5" y="3.5" width="7" height="17" rx="1" fill="none" stroke="#222" stroke-width="1.8"/><rect x="13.5" y="3.5" width="7" height="17" rx="1" fill="none" stroke="#222" stroke-width="1.8"/><line x1="10.5" y1="9" x2="13.5" y2="9" stroke="#222" stroke-width="1.8" stroke-linecap="round"/><line x1="10.5" y1="15" x2="13.5" y2="15" stroke="#222" stroke-width="1.8" stroke-linecap="round"/><line x1="6" y1="7" x2="8" y2="7" stroke="#222" stroke-width="1.5"/><line x1="6" y1="11" x2="8" y2="11" stroke="#222" stroke-width="1.5"/><line x1="6" y1="15" x2="8" y2="15" stroke="#222" stroke-width="1.5"/><line x1="16" y1="7" x2="18" y2="7" stroke="#222" stroke-width="1.5"/><line x1="16" y1="11" x2="18" y2="11" stroke="#222" stroke-width="1.5"/><line x1="16" y1="15" x2="18" y2="15" stroke="#222" stroke-width="1.5"/></svg> 30. 두 집 살림 (Two Households)**
    *   **조건:** '초이스' 칸을 기입할 때, 유효한 '풀하우스' 조건(3개+2개)으로 맞추어 기입
    *   **보상:** 기입 즉시 보너스 +10점 획득
    *   **텍스트:** 퀘스트: 풀하우스 족보를 스크래치 하지 않고 기입하고, 초이스 족보를 풀하우스 족보와 동일한 형태로 기입합니다. 퀘스트 완료시 보너스 10점을 획득합니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><path d="M8 22 v-18 l10 5 l-10 5" stroke="#222" stroke-width="2" fill="none" stroke-linejoin="round"/><rect x="4" y="20" width="8" height="2" fill="#222"/></svg> 31. 알박기 (Holdout)**
    *   **조건:** 풀하우스를 비워두었다가, 3페이즈(9~12라운드)에 진입한 이후에 풀하우스 족보 완성하여 기입
    *   **보상:** 기입 즉시 보너스 +7점 획득
    *   **텍스트:** 퀘스트: 9턴이 시작될 때까지 풀하우스를 비워두었다가, 9~12턴 사이에 풀하우스를 완성하여 기입하면 보너스 7점을 획득합니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><circle cx="10" cy="10" r="5" fill="none" stroke="#222" stroke-width="2"/><path d="M13.5 13.5 l5.5 5.5" stroke="#222" stroke-width="2.5" stroke-linecap="round"/></svg> 32. 신중한 스트레이트 (Cautious Straight)**
    *   **조건:** 스몰 스트레이트를 먼저 기입한 후에만, 라지 스트레이트를 기입 가능 (어길 시 실패)
    *   **보상:** 순서대로 모두 기입 완료 시 보너스 +7점 획득
    *   **텍스트:** 퀘스트: 스몰 스트레이트 족보를 채운 후, 라지 스트레이트를 족보를 채웁니다. (순서를 어길 시 퀘스트 실패) 퀘스트 완료 시 보너스 7점을 획득합니다. 
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><path d="M 2 20 L 8.5 7 L 12.5 13.5 L 16.5 9 L 22.5 20 Z" fill="none" stroke="#222" stroke-width="1.8" stroke-linejoin="round"/><path d="M 8.5 7 Q 10.5 10.5 8 13.5 M 16.5 9 Q 14.5 12 17 15" fill="none" stroke="#222" stroke-width="1.5" stroke-linecap="round"/></svg> 33. 티끌 모아 태산 (Every Little Makes a Mickle)**
    *   **조건:** 족보 기입 시, 포함된 주사위 '1' 눈금의 누적 사용 개수가 총 7개 도달. 턴당 누적 최대치 제한 없음
    *   **보상:** 달성 즉시 보너스 +15점 획득
    *   **텍스트:** 퀘스트: 족보 기입에 1의 눈을 가진 면을 7번 사용합니다. 퀘스트 완료 시 보너스 15점을 획득합니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><path d="M4 8 l3-5 l4 3.5 l1-1 l1 1 l4-3.5 l3 5 v6 a5 5 0 0 1 -5 5 h-6 a5 5 0 0 1 -5 -5 z" fill="none" stroke="#222" stroke-width="2" stroke-linejoin="round"/><circle cx="8.5" cy="12" r="1.2" fill="#222"/><circle cx="15.5" cy="12" r="1.2" fill="#222"/><path d="M11 14.5 l1 1 l1 -1" fill="none" stroke="#222" stroke-width="1.5" stroke-linecap="round"/><path d="M4 12.5 h3.5 M4 14.5 h3 M20 12.5 h-3.5 M20 14.5 h-3" stroke="#222" stroke-width="1.5" stroke-linecap="round"/></svg> 34. 카피캣 (Copycat)**
    *   **조건:** 상대가 입력한 족보를 따라서 3회 기입 (하단 족보를 따라 기입했을 때 족보 값이 동일하다면 즉시 완료)
    *   **보상:** 보너스 +10점 획득
    *   **텍스트:** 퀘스트: 상대가 입력한 족보를 따라서 3회 기입합니다. 하단 족보를 따라 기입했을 때, 족보의 값이 동일하다면 즉시 퀘스트를 완료합니다.<br><br>퀘스트 완료 시, 보너스 10점을 획득합니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><rect x="4" y="4" width="8" height="8" rx="2" fill="none" stroke="#222" stroke-width="2"/><rect x="12" y="12" width="8" height="8" rx="2" fill="none" stroke="#222" stroke-width="2"/></svg> 35. 더블링 (Doubling)**
    *   **조건:** 동일한 점수로 족보를 두 번 등록 (스크래치 제외)
    *   **보상:** 보너스 +10점 획득
    *   **텍스트:** 퀘스트: 동일한 점수로 족보를 두 번 등록합니다. (스크래치 제외)<br><br>퀘스트 완료 시, 보너스 10점을 획득합니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><path d="M 1.5 10.5 L 3.5 11.5 C 7 12 10.5 10 14.5 7.5 L 20 2 C 18 5 17.5 7.5 18 9 L 22 5 C 19.5 8.5 19.5 10.5 20.5 12.5 C 18 13 16 14.5 15.5 17 C 13.5 20 10 21.5 7 21.5 C 10 18.5 11 16 9 14.5 C 6 15 3.5 15.5 3 16.5 L 8 13.5 C 5 13.5 3 12.5 2.5 14.5 C 2 12.5 2 11.5 1.5 10.5 Z" fill="none" stroke="#222" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg> 36. 노즈도르무 (Nozdormu)**
    *   **조건:** 다음 페이즈 전까지 나의 턴 타이머를 서버와 클라이언트 모두 15초로 설정하여 플레이
    *   **보상:** 보너스 +9점 획득
    *   **텍스트:** 퀘스트: 다음 페이즈 전까지 나의 턴 타이머를 15초로 설정합니다.<br><br>퀘스트 완료 시, 보너스 9점을 획득합니다.

---

## 📌 3. 강화 (Enhancement)
내 주사위의 구성이나 족보 기입 규칙 자체를 지속적이고 유리하게 바꿔줍니다.

*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><path d="M 12 3 L 19.8 7.5 L 19.8 16.5 L 12 21 L 4.2 16.5 L 4.2 7.5 Z" fill="none" stroke="#222" stroke-width="1.8" stroke-linejoin="round"/><path d="M 12 12 L 19.8 7.5 M 12 12 L 12 21 M 12 12 L 4.2 7.5" fill="none" stroke="#222" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> 37. 묵직한 주사위 (Weighted Dice)**
    *   **효과:** 내 주사위 중 1개를 [4, 4, 5, 5, 6, 6] 눈금이 적힌 주사위로 영구 교체
    *   **텍스트:** 기본 주사위를 묵직한 주사위로 변경합니다.<br><br>묵직한 주사위는 [4, 4, 5, 5, 6, 6] 눈을 가집니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><circle cx="15" cy="5" r="2.2" fill="#222"/><path d="M 13 8 L 11 13.5 M 13 8 L 9.5 7.5 L 7.5 10.5 M 13 8 L 15 11 L 18.5 9.5 M 11 13.5 L 8 16.5 L 4.5 14.5 M 11 13.5 L 14.5 16 L 14.5 21.5" fill="none" stroke="#222" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg> 38. 추진력 (Momentum)**
    *   **효과:** 내가 족보에 처음으로 0점(스크래치)을 기록했을 때 발동. 내 다음 턴에 어떤 족보든 1점 이상을 기입하면 획득 점수가 1.5배로 증가 (단 1회 발동)
    *   **텍스트:** 족보에 처음으로 0점(스크래치)을 기록했을 때 발동합니다. 다음 턴에 어떤 족보든 점수를 획득하면 해당 점수가 1.5배로 증가합니다. (단 1회 발동)
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="#222" stroke-width="2"/><path d="M 12 5.5 L 13.8 9.2 L 17.8 9.8 L 14.9 12.6 L 15.6 16.5 L 12 14.6 L 8.4 16.5 L 9.1 12.6 L 6.2 9.8 L 10.2 9.2 Z" fill="#222" stroke="#222" stroke-width="0.8" stroke-linejoin="round"/></svg> 39. 황금 주사위 (Golden Die)**
    *   **효과:** 내 주사위 중 1개를 황금 주사위로 지정. 족보 기입 시 이 주사위 눈금이 1, 2, 3 중 하나라면 +2점 추가 획득 (단, 상단 보너스 계산에서는 제외)
    *   **텍스트:** 기본 주사위를 황금 주사위로 변경합니다.<br><br>황금 주사위의 면이 1, 2, 3 이 나왔을 때 족보를 기입하면 추가로 +2점을 얻습니다. (보너스 계산 제외)
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><path d="M12 4 a8 8 0 1 0 8 8" stroke="#222" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M20 7 v5 h-5" stroke="#222" stroke-width="2.5" fill="none" stroke-linejoin="round"/></svg> 40. 아직 안 끝났어 (It's Not Over Yet)**
    *   **효과:** 획득 즉시 조건이 나쁜 족보(낮은 점수) 1개를 무작위로 빈칸으로 초기화하고 1턴 추가 획득. 이후 해당 족보를 다시 기입할 때 +3점 추가 획득 (이 보너스는 상단 계산에 포함)
    *   **텍스트:** 획득 즉시 가장 점수가 낮은 족보 1개를 빈칸으로 초기화하고 1턴 추가 획득합니다. 이후 해당 족보를 다시 기입할 때 기본 점수에 +3점을 추가로 획득합니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><path d="M12 2 L20 12 L12 22 L4 12 Z M4 12 H20 M12 2 L16 12 L12 22 M12 2 L8 12 L12 22" fill="none" stroke="#222" stroke-width="1.5" stroke-linejoin="round"/></svg> 41. 8면 주사위 (8-Sided Dice)**
    *   **효과:** 내 주사위 중 2개를 [1, 2, 3, 4, 4, 5, 5, 6] 눈금이 적힌 주사위로 영구 교체
    *   **획득 제한:** 이상한 주사위 또는 판 뒤집기와 동시에 보유할 수 없음.
    *   **텍스트:** 기본 주사위를 8면 주사위로 변경합니다.<br><br>8면 주사위는 [1, 2, 3, 4, 4, 5, 5, 6] 눈을 가집니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="#222" stroke-width="2"/><path d="M 9.5 8.5 C 9.5 6.5 14.5 6.5 14.5 9 C 14.5 11 12 11.5 12 14" fill="none" stroke="#222" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="16.8" r="1.2" fill="#222"/></svg> 42. 이상한 주사위 (Strange Die)**
    *   **효과:** 족보에 쓸 수 없는 조커 주사위 1개 추가. 매 턴 기입 시 눈금 결과(+2, +1, +1, 0, -1, 파괴)가 최종 점수에 반영. 파괴 면이 나오면 영구 제거됨. (유지하려면 킵 슬롯 소모)
    *   **획득 제한:** 8면 주사위와 동시에 보유할 수 없음.
    *   **텍스트:** 이상한 주사위를 한 개 추가합니다.<br><br>이상한 주사위는 [+2, +1, +1, 0, -1, 파괴] 면을 가지고 있으며, 족보에 쓸 수 없습니다. 매 턴 족보를 기입 시 눈금 결과가 족보 점수에 반영됩니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="#222" stroke-width="2"/><path d="M 6.5 16 H 17.5 L 18.5 9 L 14.5 12 L 12 7 L 9.5 12 L 5.5 9 Z" fill="none" stroke="#222" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/><circle cx="5.5" cy="8.5" r="0.8" fill="#222"/><circle cx="12" cy="6.5" r="0.8" fill="#222"/><circle cx="18.5" cy="8.5" r="0.8" fill="#222"/></svg> 43. 프로모션 주사위 (Promotion Die)**
    *   **효과:** 기본 주사위 1개를 프로모션 주사위로 변경. 턴이 지날수록 눈금이 1씩 상승(최대 6). 6의 눈인 상태에서 족보를 기입할 시 소모되어 기본 주사위로 돌아옵니다.
    *   **텍스트:** 기본 주사위 1개를 프로모션 주사위로 변경합니다.<br><br>프로모션 주사위는 모든 눈금이 동일한 주사위며, 초기 눈금이 1입니다. 턴이 지나면 모든 면의 눈 개수가 1 증가합니다. 주사위 눈이 6일 때 족보 기입 시 기본 주사위로 돌아옵니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><defs><clipPath id="couple-md-clip"><path d="M 0 0 H 24 V 24 H 0 Z M 3 10 H 14 V 21 H 3 Z" fill-rule="evenodd"/></clipPath></defs><g clip-path="url(#couple-md-clip)"><rect x="10" y="3" width="11" height="11" rx="2" fill="none" stroke="#222" stroke-width="1.8"/><path d="M 15.5 5.8 C 13.8 4.2 11.5 5.8 11.5 8.2 C 11.5 10.5 13.8 12.2 15.5 13.2 C 17.2 12.2 19.5 10.5 19.5 8.2 C 19.5 4.2 17.2 4.2 15.5 5.8 Z" fill="#222"/></g><rect x="3" y="10" width="11" height="11" rx="2" fill="none" stroke="#222" stroke-width="1.8"/><path d="M 8.5 12.8 C 6.8 11.2 4.5 12.8 4.5 15.2 C 4.5 17.5 6.8 19.2 8.5 20.2 C 10.2 19.2 12.5 17.5 12.5 15.2 C 12.5 11.2 10.2 11.2 8.5 12.8 Z" fill="#222"/></svg> 44. 커플 주사위 (Couple Dice)**
    *   **효과:** 내 주사위 중 2개를 커플 주사위로 영구 교체. 족보 기입 시 두 주사위의 눈금이 같다면 +3점 추가 획득 (상단 보너스 계산 제외)
    *   **텍스트:** 기본 주사위 2개를 커플 주사위로 변경합니다.<br><br>족보를 기입 할 때, 커플 주사위 두 개의 눈금이 같다면 +3점 추가로 획득합니다. (단, 상단 보너스 계산에서는 제외)
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="#222" stroke-width="2"/><circle cx="7.5" cy="7.5" r="1.3" fill="#222"/><circle cx="16.5" cy="7.5" r="1.3" fill="#222"/><circle cx="7.5" cy="12" r="1.3" fill="#222"/><circle cx="12" cy="12" r="1.3" fill="#222"/><circle cx="16.5" cy="16.5" r="1.3" fill="#222"/><circle cx="7.5" cy="16.5" r="1.3" fill="#222"/><circle cx="16.5" cy="16.5" r="1.3" fill="#222"/></svg> 45. 세븐스 다이스 (Sevens Dice)**
    *   **효과:** 내 주사위 중 2개를 [2, 3, 4, 5, 6, 7] 눈금을 가진 주사위로 영구 교체. 스트레이트 달성 시 '7' 눈금 사용 가능.
    *   **텍스트:** 기본 주사위를 세븐스 다이스로 변경합니다.<br><br>세븐스 다이스는 [2, 3, 4, 5, 6, 7] 눈금을 가지며, 스트레이트 달성 시 '7' 눈금을 사용해서 족보의 조건을 채울 수 있습니다.
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><path d="M 3 18 L 21 18 M 5 18 L 5 13 C 5 11 7 9 12 9 C 17 9 19 11 19 13 L 19 18 M 12 4 L 12 11 M 9 7 L 12 4 L 15 7" stroke="#222" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg> 46. 판 뒤집기 (Table Flip)**
    *   **효과:** 게임 당 한 번, 킵 하지 않은 주사위를 강하게 흔들며 재굴림 (리롤 횟수 미소모)
    *   **텍스트:** 게임 당 한 번, 내 턴에 판 뒤집기를 사용 가능합니다.<br><br>킵 하지 않은 주사위가 위로 솟구친 다음 떨어져 다시 굴러갑니다. (리롤을 소모하지 않습니다.)
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><g stroke="#222" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17" /><path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.88l-1 .76" /></g><g transform="translate(7, 2) rotate(10)"><rect x="0" y="0" width="6" height="6" rx="1.2" fill="none" stroke="#222" stroke-width="1.5"/><circle cx="2" cy="2" r="0.6" fill="#222"/><circle cx="4" cy="4" r="0.6" fill="#222"/></g></svg> 47. 등가교환 (Equivalent Exchange)**
    *   **효과:** 게임 당 최대 3회, 리롤 소모 후 -5점 감점을 받고 리롤 기회 1회 추가 획득
    *   **텍스트:** 게임 중 단 세 번, 리롤을 다 소모한 후에도 -5점의 페널티를 받고 주사위를 추가로 굴릴 수 있습니다.<br><br>(한 라운드에서 연속해서 사용할 수 있습니다.)
*   **<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;"><circle cx="12" cy="12" r="9" fill="none" stroke="#222" stroke-width="1.8"/><line x1="12" y1="2" x2="12" y2="5" stroke="#222" stroke-width="1.8" stroke-linecap="round"/><line x1="12" y1="19" x2="12" y2="22" stroke="#222" stroke-width="1.8" stroke-linecap="round"/><line x1="2" y1="12" x2="5" y2="12" stroke="#222" stroke-width="1.8" stroke-linecap="round"/><line x1="19" y1="12" x2="22" y2="12" stroke="#222" stroke-width="1.8" stroke-linecap="round"/><g transform="translate(9.5, 9.5)"><rect x="0" y="0" width="5" height="5" rx="1" fill="#222" stroke="#222" stroke-width="0.5"/><circle cx="2.5" cy="2.5" r="0.6" fill="#fff"/></g></svg> 48. 현상금 사냥꾼 (Bounty Hunter)**
    *   **효과:** 매 턴마다 아직 점수가 기입되지 않은 족보 중 무작위 하나가 타겟으로 금색 하이라이트 지정. 타겟 족보를 3회 기입하면 퀘스트 완료(+15점 보너스). 스크래치(0점)로 기입할 때마다 최종 보상 -3점 감점.
    *   **텍스트:** 매 턴마다 점수가 기입되지 않은 족보 중 무작위 하나가 타겟으로 지정됩니다. 타겟 족보를 3회 기입하면 완료됩니다. 단, 스크래치(0점)로 기입 시 최종 보너스가 -3점씩 감소합니다.

## 📌 4. 신규 퀘스트 (Quest)

*   **52. 예지자 (Prophet)**
    *   **조건:** 획득 후 3턴 동안 매 턴 빈 족보에서 실제 가능한 1~30 점수 중 3개를 제시함.
    *   **효과:** 기입한 최종 점수가 제시 숫자와 같으면 매회 전역 보너스 +7점 획득함.
    *   **예외:** 0점과 31점 이상은 후보에서 제외함.

## 📌 5. 신규 강화 (Enhancement)

*   **49. 결투 (Duel)**
    *   **효과:** 획득 라운드에 두 플레이어가 기입한 최종 점수를 비교함. 보유자가 높으면 +10점, 동점이면 보유자만 +5점 획득함.
    *   **예외:** 상대 기권으로 게임이 끝나면 결투는 미결정 상태로 종료함.
    *   **표시:** 판정 전에는 `결투 중!`, 판정 후에는 보유자 기준으로 `결투 승리!`, `결투 패배`, `결투 무승부`를 표시함.
*   **50. 코인 토스 (Coin Toss)**
    *   **효과:** 첫 굴림 후 1회 사용함. 앞면 0개는 -5점, 1개는 최저 주사위를 6으로 변경, 2개는 리롤 +1회, 3개는 보유자의 상단 기준을 57점으로 낮춤.
*   **51. 랜덤 박스 (Random Box)**
    *   **효과:** 선택 중에는 랜덤 박스 카드를 표시함. 두 플레이어의 해당 페이즈 선택이 모두 끝나면 상단 기준을 58점으로 낮추고 랜덤 박스 카드를 퀘스트가 아닌 무작위 증강 1개로 교체함.
    *   **예외:** 자신·보유 중·충돌·비활성 증강을 제외함. 변형 당첨 시 기존 변형 슬롯을 덮어씀.
*   **53. 갬빗 (Gambit)**
    *   **효과:** 굴리기 전 1회 선언함. 선언 턴은 일반 주사위 4개, 다음 내 턴은 일반 주사위 6개를 사용함.
*   **54. 더블 다운 (Double Down)**
    *   **효과:** 9턴부터 굴리기 전 1회 선언함. 해당 턴 유효 점수를 1.5배로 적용함.
    *   **중첩:** 추진력과 동시에 발동하면 합연산으로 2배 적용함.
*   **55. 저금통 (Piggy Bank)**
    *   **효과:** 턴 종료 시 남은 리롤 1회당 3점을 적립함. 12점 이상이면 전역 보너스 12점을 지급하고 비움.
*   **56. 주사위 연금술 (Dice Alchemy)**
    *   **효과:** 첫 굴림 후 1회 사용함. 킵하지 않은 주사위 눈을 최소 1까지 각각 1 낮춤.



