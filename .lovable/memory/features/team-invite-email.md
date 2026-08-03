---
name: Team invite email (pending)
description: Team invites only generate a link; email sending is deferred until a sender domain is set up
type: feature
---
Takım üyesi daveti (TeamPage) şu an sadece `workspace_invites` kaydı + kopyalanabilir davet linki üretiyor. E-posta gönderimi YOK.

Sebep: projede gönderen e-posta alan adı / e-posta altyapısı kurulu değil.

Kullanıcı kararı: bunu **sonraya bıraktık**. Kullanıcı açıkça istemeden e-posta kurulumunu tekrar önerme.

Yapılacaklar (istendiğinde): decisionosai.com için email domain setup → setup_email_infra → davet e-postası gönderen edge function + TeamPage'den tetikleme.
