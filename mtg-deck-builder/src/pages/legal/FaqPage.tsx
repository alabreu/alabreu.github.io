import { LegalPage, H2, P } from './LegalPage';

export default function FaqPage() {
  return (
    <LegalPage title="Ajuda / FAQ" updated="4 de agosto de 2026">
      <H2>O que é o Tutor Brew?</H2>
      <P>
        Um aplicativo para montar, organizar e analisar decks de Magic: The Gathering (foco no
        formato Commander), com um assistente de inteligência artificial — o Tutor — para tirar
        dúvidas e sugerir melhorias.
      </P>

      <H2>É oficial ou afiliado à Wizards of the Coast?</H2>
      <P>
        Não. É um projeto de fã, não-oficial, sem afiliação nem endosso da Wizards of the Coast. Os
        dados e imagens de cartas vêm do Scryfall.
      </P>

      <H2>Preciso de conta?</H2>
      <P>
        Para montar decks no seu aparelho, não. Criar uma conta (login por e-mail ou Google) libera o
        Tutor e a sincronização dos seus decks na nuvem entre dispositivos.
      </P>

      <H2>Posso confiar nas respostas do Tutor?</H2>
      <P>
        O Tutor ajuda bastante, mas é gerado por IA e pode errar. Confirme regras, legalidade e preços
        em fontes oficiais. O uso do Tutor tem um limite diário.
      </P>

      <H2>Meus decks são privados?</H2>
      <P>
        Sim. Quando você está logado, seus decks ficam vinculados apenas à sua conta e isolados de
        outros usuários. Veja a Política de Privacidade para detalhes.
      </P>

      <H2>É grátis? Vai passar a custar?</H2>
      <P>
        Hoje o app é gratuito. No futuro o Tutor pode ganhar um plano pago; se isso acontecer, você
        será avisado com antecedência e o restante do app continua utilizável.
      </P>

      <H2>Como importo ou exporto um deck?</H2>
      <P>
        No menu do deck (ícone ···), use "Importar cartas" e "Exportar cartas". Para adicionar ou
        remover várias cartas de uma vez em um deck já aberto, use "Editar por lista".
      </P>

      <H2>Como excluo minha conta?</H2>
      <P>
        No menu da tela inicial, abra "Configurações" → seção "Conta" → "Excluir conta". A ação apaga
        permanentemente sua conta e os decks salvos na nuvem.
      </P>

      <H2>Achei um bug ou tenho uma sugestão. O que faço?</H2>
      <P>
        Use "Enviar feedback" no menu da tela inicial — sua mensagem chega direto para nós. Se
        preferir e-mail, escreva para{' '}
        <a href="mailto:contato@tutor-brew.com" style={{ color: 'var(--accent)' }}>contato@tutor-brew.com</a>.
      </P>
    </LegalPage>
  );
}
