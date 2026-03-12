/**
 * P9-16: FAQ 시드 데이터
 * 고객 지원 시스템의 자주 묻는 질문 초기 데이터
 */

export interface FAQItem {
  id: string;
  category: string;
  question_ko: string;
  answer_ko: string;
  question_en: string;
  answer_en: string;
  order: number;
}

export const FAQ_SEEDS: FAQItem[] = [
  // ─── 계정 ─────────────────────────────────────────────────
  {
    id: 'faq-account-01',
    category: 'ACCOUNT',
    question_ko: '비밀번호를 잊었어요. 어떻게 재설정하나요?',
    answer_ko: '로그인 화면에서 "비밀번호 찾기"를 클릭하고, 등록된 이메일 주소를 입력하면 재설정 링크가 발송됩니다. 링크는 24시간 동안 유효합니다.',
    question_en: 'I forgot my password. How do I reset it?',
    answer_en: 'Click "Forgot Password" on the login screen and enter your registered email. A reset link will be sent to you, valid for 24 hours.',
    order: 1,
  },
  {
    id: 'faq-account-02',
    category: 'ACCOUNT',
    question_ko: '2단계 인증(2FA)은 어떻게 설정하나요?',
    answer_ko: '설정 > 보안 > 2단계 인증에서 TOTP 앱(Google Authenticator 등)으로 QR 코드를 스캔하여 설정할 수 있습니다. 설정 시 백업 코드를 반드시 저장해 주세요.',
    question_en: 'How do I set up Two-Factor Authentication (2FA)?',
    answer_en: 'Go to Settings > Security > Two-Factor Auth and scan the QR code with a TOTP app (e.g., Google Authenticator). Be sure to save your backup codes.',
    order: 2,
  },
  {
    id: 'faq-account-03',
    category: 'ACCOUNT',
    question_ko: '계정을 삭제하고 싶어요.',
    answer_ko: '설정 > 개인정보 > 계정 삭제에서 요청할 수 있습니다. 삭제 요청 후 30일의 유예 기간이 있으며, 이 기간 내 로그인하면 삭제가 취소됩니다. 삭제 후 모든 데이터는 복구 불가합니다.',
    question_en: 'I want to delete my account.',
    answer_en: 'You can request deletion at Settings > Privacy > Delete Account. There is a 30-day grace period; logging in during this time cancels the deletion. All data is irrecoverable after deletion.',
    order: 3,
  },

  // ─── 결제 ─────────────────────────────────────────────────
  {
    id: 'faq-payment-01',
    category: 'PAYMENT',
    question_ko: '결제 수단은 무엇이 있나요?',
    answer_ko: 'Stripe를 통해 Visa, Mastercard, American Express 등 주요 신용/체크카드로 결제할 수 있습니다. 일부 지역에서는 Apple Pay, Google Pay도 지원됩니다.',
    question_en: 'What payment methods are accepted?',
    answer_en: 'We accept major credit/debit cards (Visa, Mastercard, Amex) through Stripe. Apple Pay and Google Pay are available in some regions.',
    order: 4,
  },
  {
    id: 'faq-payment-02',
    category: 'PAYMENT',
    question_ko: '환불을 받고 싶어요.',
    answer_ko: '구매 후 7일 이내, 미사용 상태의 크리스탈은 전액 환불 가능합니다. 설정 > 고객 지원에서 "결제/환불" 카테고리로 문의해 주세요. 처리에는 영업일 기준 1~3일이 소요됩니다.',
    question_en: 'I want a refund.',
    answer_en: 'Unused Crystals can be fully refunded within 7 days of purchase. Submit a ticket under "Payment / Refund" category. Processing takes 1-3 business days.',
    order: 5,
  },
  {
    id: 'faq-payment-03',
    category: 'PAYMENT',
    question_ko: '결제했는데 크리스탈이 지급되지 않았어요.',
    answer_ko: '결제 완료 후 최대 5분까지 지연될 수 있습니다. 5분이 지나도 지급되지 않으면 고객 지원에 문의해 주세요. 주문 ID와 결제 일시를 함께 알려주시면 빠르게 처리됩니다.',
    question_en: 'I paid but didn\'t receive my Crystals.',
    answer_en: 'Delivery may take up to 5 minutes. If not received after 5 minutes, please contact support with your Order ID and payment date for quick resolution.',
    order: 6,
  },

  // ─── 게임플레이 ───────────────────────────────────────────
  {
    id: 'faq-gameplay-01',
    category: 'GAMEPLAY',
    question_ko: '클래스를 변경할 수 있나요?',
    answer_ko: '현재 클래스 변경은 지원되지 않습니다. 새 캐릭터를 생성하여 다른 클래스를 플레이할 수 있습니다. 계정당 최대 5개의 캐릭터를 생성할 수 있습니다.',
    question_en: 'Can I change my class?',
    answer_en: 'Class changes are not currently supported. You can create a new character with a different class. Up to 5 characters per account are allowed.',
    order: 7,
  },
  {
    id: 'faq-gameplay-02',
    category: 'GAMEPLAY',
    question_ko: '파티는 어떻게 만드나요?',
    answer_ko: '화면 하단 파티 아이콘을 클릭하거나 /party create 명령어를 입력하세요. 최대 4인 파티를 구성할 수 있으며, 파티원 초대는 닉네임 또는 친구 목록에서 가능합니다.',
    question_en: 'How do I create a party?',
    answer_en: 'Click the party icon at the bottom of the screen or type /party create. You can form a party of up to 4 members and invite by username or from your friend list.',
    order: 8,
  },
  {
    id: 'faq-gameplay-03',
    category: 'GAMEPLAY',
    question_ko: '길드는 어떻게 가입하나요?',
    answer_ko: '메뉴 > 길드 > 길드 검색에서 원하는 길드를 찾아 가입 신청할 수 있습니다. 길드 생성에는 레벨 20 이상 + 10,000 골드가 필요합니다.',
    question_en: 'How do I join a guild?',
    answer_en: 'Go to Menu > Guild > Search Guild to find and apply. Creating a guild requires Level 20+ and 10,000 Gold.',
    order: 9,
  },

  // ─── 기술 지원 ────────────────────────────────────────────
  {
    id: 'faq-tech-01',
    category: 'BUG_REPORT',
    question_ko: '게임이 로딩되지 않아요.',
    answer_ko: '다음을 시도해 주세요: 1) 브라우저 캐시 삭제, 2) 다른 브라우저 시도 (Chrome/Edge 권장), 3) 브라우저 확장 프로그램 비활성화, 4) WebGL 지원 확인. 문제가 지속되면 고객 지원에 문의해 주세요.',
    question_en: 'The game won\'t load.',
    answer_en: 'Try: 1) Clear browser cache, 2) Use Chrome or Edge, 3) Disable browser extensions, 4) Verify WebGL support. If the issue persists, contact support.',
    order: 10,
  },
  {
    id: 'faq-tech-02',
    category: 'BUG_REPORT',
    question_ko: '렉이 심해요 / FPS가 낮아요.',
    answer_ko: '설정 > 그래픽에서 품질을 낮추거나, 다른 탭/프로그램을 닫아 시스템 자원을 확보해 주세요. Unity WebGL 클라이언트는 Chrome에서 최적의 성능을 제공합니다.',
    question_en: 'I\'m experiencing lag / low FPS.',
    answer_en: 'Lower graphics settings in Settings > Graphics. Close other tabs/programs to free resources. Unity WebGL performs best in Chrome.',
    order: 11,
  },

  // ─── 신고 ─────────────────────────────────────────────────
  {
    id: 'faq-report-01',
    category: 'ABUSE_REPORT',
    question_ko: '다른 유저를 신고하고 싶어요.',
    answer_ko: '해당 유저의 프로필 > 신고 버튼을 클릭하거나, /report [닉네임] [사유] 명령어를 사용하세요. 증거 스크린샷을 첨부하면 처리가 빠릅니다. 신고 접수 후 24시간 이내 검토됩니다.',
    question_en: 'I want to report another user.',
    answer_en: 'Click the Report button on their profile, or use /report [username] [reason]. Attaching screenshot evidence speeds up processing. Reports are reviewed within 24 hours.',
    order: 12,
  },
  {
    id: 'faq-report-02',
    category: 'ABUSE_REPORT',
    question_ko: '제재를 받았는데 이의신청하고 싶어요.',
    answer_ko: '고객 지원 > "계정" 카테고리로 이의신청 티켓을 생성해 주세요. 제재 사유, 계정 정보, 이의신청 근거를 작성하면 영업일 기준 3일 이내 검토 결과를 알려드립니다.',
    question_en: 'I was sanctioned and want to appeal.',
    answer_en: 'Submit an appeal ticket under the "Account" category. Include sanction reason, account info, and grounds for appeal. Reviews are completed within 3 business days.',
    order: 13,
  },
];

/**
 * FAQ 시드 데이터를 DB에 삽입한다 (upsert).
 */
export async function seedFAQ(prismaClient: any): Promise<number> {
  let count = 0;
  for (const faq of FAQ_SEEDS) {
    await prismaClient.faq.upsert({
      where: { id: faq.id },
      create: faq,
      update: faq,
    });
    count++;
  }
  return count;
}

export default { FAQ_SEEDS, seedFAQ };
