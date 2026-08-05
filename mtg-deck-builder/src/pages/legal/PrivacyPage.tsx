import { LegalPage, H2, P, UL, LI } from './LegalPage';

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de Privacidade" updated="4 de agosto de 2026">
      <P>
        Esta Política explica quais dados o Tutor Brew coleta, como os usamos e quais são os seus
        direitos, em conformidade com a Lei Geral de Proteção de Dados (LGPD).
      </P>

      <H2>1. Dados que coletamos</H2>
      <UL>
        <LI><strong>Conta:</strong> seu e-mail e, se você usar login por senha, uma senha (armazenada de forma segura e criptografada pelo nosso provedor de autenticação).</LI>
        <LI><strong>Seus decks:</strong> quando logado, seus decks são sincronizados na nuvem para você acessá-los em vários dispositivos.</LI>
        <LI><strong>Uso do Tutor:</strong> para operar limites e entender custos, registramos metadados de cada mensagem (modelo usado, quantidade de tokens, custo estimado). <strong>Não armazenamos o conteúdo das suas conversas com o Tutor</strong> — o texto é enviado ao provedor de IA apenas para gerar a resposta.</LI>
        <LI><strong>Feedback:</strong> se você enviar um feedback, guardamos a mensagem e, se você informar, um e-mail de contato.</LI>
        <LI><strong>Dados técnicos:</strong> como em qualquer site, nossos provedores de infraestrutura podem registrar dados técnicos (por exemplo, endereço IP e tipo de dispositivo) para segurança e funcionamento do serviço.</LI>
      </UL>

      <H2>2. Como usamos seus dados</H2>
      <P>
        Usamos os dados para autenticar seu acesso, sincronizar seus decks, operar o assistente
        Tutor e aplicar limites de uso, garantir a segurança, entender custos e melhorar o app, e
        para nos comunicarmos com você sobre sua conta.
      </P>

      <H2>2.1. Base legal (LGPD)</H2>
      <P>
        Tratamos seus dados para a execução do serviço que você solicitou (contrato), com base no
        nosso legítimo interesse (segurança e melhoria do app) e, quando aplicável, com base no seu
        consentimento.
      </P>

      <H2>3. Com quem compartilhamos</H2>
      <P>
        Não vendemos seus dados. Utilizamos provedores que processam dados em nosso nome, apenas para
        operar o serviço:
      </P>
      <UL>
        <LI><strong>Supabase</strong> — autenticação, banco de dados e hospedagem dos seus decks.</LI>
        <LI><strong>Cloudflare</strong> — entrega do site e proteção da infraestrutura.</LI>
        <LI><strong>OpenRouter</strong> — processa o texto que você envia ao Tutor para gerar a resposta.</LI>
        <LI><strong>Resend</strong> — envio dos e-mails de login e confirmação.</LI>
        <LI><strong>Google</strong> — quando você opta por entrar com sua conta Google.</LI>
      </UL>
      <P>
        As buscas de cartas são feitas diretamente do seu navegador para o Scryfall, sujeitas à
        política de privacidade deles.
      </P>

      <H2>4. Armazenamento no seu dispositivo</H2>
      <P>
        Usamos o armazenamento local do navegador para o funcionamento do app (sua sessão, suas
        preferências e seus decks para uso offline). Não usamos cookies de rastreamento publicitário.
      </P>

      <H2>5. Retenção</H2>
      <P>
        Mantemos seus dados enquanto sua conta existir. Ao excluir sua conta, removemos seus decks
        associados; registros técnicos podem ser mantidos por um período limitado por motivos de
        segurança.
      </P>

      <H2>6. Seus direitos</H2>
      <P>
        Você pode solicitar acesso, correção, exclusão, portabilidade dos seus dados e a revogação do
        consentimento. Para exercer esses direitos, escreva para{' '}
        <a href="mailto:contato@tutor-brew.com" style={{ color: 'var(--accent)' }}>contato@tutor-brew.com</a>{' '}
        ou use a opção "Enviar feedback" no menu do app. Você também pode excluir sua conta e todos
        os seus dados a qualquer momento, sozinho, em Configurações → Excluir conta.
      </P>

      <H2>7. Transferência internacional</H2>
      <P>
        Alguns dos provedores acima podem processar dados fora do Brasil. Nesses casos, buscamos
        provedores que adotem salvaguardas adequadas de proteção de dados.
      </P>

      <H2>8. Crianças</H2>
      <P>
        O serviço não é direcionado a menores de 13 anos. Se você é menor de idade, use o app com o
        consentimento de um responsável.
      </P>

      <H2>9. Segurança</H2>
      <P>
        Adotamos medidas técnicas para proteger seus dados (como isolamento por usuário no banco e
        criptografia em trânsito). Nenhum sistema, porém, é completamente seguro.
      </P>

      <H2>10. Alterações</H2>
      <P>
        Podemos atualizar esta Política; mudanças relevantes serão sinalizadas no app.
      </P>

      <H2>11. Contato</H2>
      <P>
        Para dúvidas sobre privacidade ou para exercer seus direitos, escreva para{' '}
        <a href="mailto:contato@tutor-brew.com" style={{ color: 'var(--accent)' }}>contato@tutor-brew.com</a>.
        Respondemos em até 15 dias, o prazo previsto na LGPD. Você também pode usar a opção
        "Enviar feedback" no menu do app.
      </P>
    </LegalPage>
  );
}
