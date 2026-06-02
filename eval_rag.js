(async () => {
  const tests = [
    { q: 'Who founded Wacto?', re: /durga|sekher|gunasekaran/i },
    { q: 'Who are the founders of Wacto?', re: /durga|sekher|gunasekaran/i },
    { q: 'What are the pricing plans?', re: /free|starter|enterprise|plan|pricing/i },
    { q: 'Explain the pricing structure', re: /plan|pricing|per month|tier|free|enterprise/i },
    { q: 'How can I integrate Wacto with my business?', re: /integrat|crm|erp|api|webhook/i },
    { q: 'Tell me about integration services', re: /integrat|crm|erp|connector|integration/i },
    { q: 'What features does Wacto offer?', re: /whatsapp|chatbot|automate|automation|analytics|crm/i },
    { q: 'How do I contact Wacto?', re: /wecare@wacto.in|\+91-?8012?666888|contact/i },
    { q: 'What is the phone number?', re: /\+91-?8012?666888|\+918012666888|8012666888|9184287505/i },
    { q: 'What is the email address?', re: /wecare@wacto\.in/i },
    { q: 'Where is Wacto located?', re: /adyar|chennai|padmini/i },
    { q: 'What is Wacto WhatsApp API?', re: /whatsapp business api|whatsapp api|api/i }
  ];

  const fetch = global.fetch || (await import('node-fetch')).default;
  const results = [];
  for (const t of tests) {
    const start = Date.now();
    try {
      const res = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: t.q, history: [] })
      });
      const json = await res.json();
      const reply = (json.reply || '').replace(/\n/g, ' ');
      const duration = (Date.now() - start) / 1000;
      const pass = t.re.test(reply);
      results.push({ query: t.q, reply: reply.slice(0,400), pass, duration });
      console.log(`${pass ? 'PASS' : 'FAIL'} | ${t.q} | ${duration}s\n  => ${reply}\n`);
    } catch (e) {
      const duration = (Date.now() - start) / 1000;
      results.push({ query: t.q, reply: '', pass: false, duration, error: e.message });
      console.log(`ERR  | ${t.q} | ${duration}s\n  => ${e.message}\n`);
    }
  }

  const passed = results.filter(r => r.pass).length;
  const total = results.length;
  const avgTime = (results.reduce((s,r)=>s+(r.duration||0),0)/total).toFixed(3);
  const accuracy = ((passed/total)*100).toFixed(1);
  const summary = { total, passed, accuracy: `${accuracy}%`, avgTime: `${avgTime}s`, details: results };
  const fs = await import('fs');
  fs.writeFileSync('./rag_evaluation.json', JSON.stringify(summary, null, 2));
  console.log('\n=== SUMMARY ===\n', summary);
})();