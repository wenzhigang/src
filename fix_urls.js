const tcb = require('@cloudbase/node-sdk');
const app = tcb.init({ env: 'cloudbase-d7gl3kh5vf6b71edc' });
const db = app.database();

const OLD_HOST = '636c-cloudbase-d7gl3kh5vf6b71edc.tcb.qcloud.la';
const NEW_HOST = '636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la';

async function fixUrls() {
  const res = await db.collection('artworks')
    .where({ image_url: db.RegExp({ regexp: OLD_HOST.replace(/\./g, '\\.'), flags: '' }) })
    .field({ _id: true, image_url: true })
    .limit(500)
    .get();

  const bad = res.data.filter(r => r.image_url.indexOf('-1422923265') === -1);
  console.log('需修复:', bad.length, '条');

  let ok = 0;
  for (const r of bad) {
    const newUrl = r.image_url.replace(OLD_HOST, NEW_HOST);
    try {
      await db.collection('artworks').doc(r._id).update({ image_url: newUrl });
      ok++;
      if (ok % 50 === 0) console.log('已修复', ok, '/', bad.length);
    } catch(e) {
      console.log('失败:', r._id, e.message);
    }
  }
  console.log('完成！修复', ok, '条');
}

fixUrls().catch(console.error);
