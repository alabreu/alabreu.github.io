import { LegalPage, H2, P, UL, LI } from './LegalPage';

export default function TermsPage() {
  return (
    <LegalPage title="Termos de Uso" updated="16 de julho de 2026">
      <P>
        Bem-vindo ao Tutor Brew. Estes Termos de Uso regem o uso do aplicativo e dos serviços
        oferecidos aqui. Ao criar uma conta ou usar o app, você concorda com estes Termos. Se não
        concordar, não use o serviço.
      </P>

      <H2>1. O que é o Tutor Brew</H2>
      <P>
        O Tutor Brew é um aplicativo <strong>não-oficial</strong> para montar, organizar e analisar
        decks de Magic: The Gathering, com foco no formato Commander, incluindo um assistente de
        inteligência artificial (o "Tutor"). Não somos afiliados, patrocinados nem endossados pela
        Wizards of the Coast.
      </P>

      <H2>2. Conta e elegibilidade</H2>
      <P>
        Você pode entrar por e-mail e senha ou pela sua conta Google. Você é responsável por manter
        suas credenciais em segurança e por toda atividade realizada na sua conta. Use o serviço
        apenas se tiver a idade mínima exigida pela legislação do seu país para consentir com o
        tratamento dos seus dados; menores devem usar com o consentimento de um responsável.
      </P>

      <H2>3. Uso aceitável</H2>
      <UL>
        <LI>Não use o serviço para fins ilegais ou que violem direitos de terceiros.</LI>
        <LI>Não tente burlar limites de uso, mecanismos de segurança ou sobrecarregar o serviço.</LI>
        <LI>Não use o Tutor para gerar conteúdo fora do escopo de Magic ou conteúdo abusivo.</LI>
      </UL>

      <H2>4. O assistente Tutor (IA)</H2>
      <P>
        As respostas do Tutor são geradas por modelos de inteligência artificial e têm caráter
        informativo. Elas <strong>podem conter erros</strong> e não substituem as regras oficiais, a
        legalidade das cartas ou preços — confirme sempre em fontes oficiais. O uso do Tutor pode
        estar sujeito a limites diários.
      </P>

      <H2>5. Seus decks</H2>
      <P>
        Os decks que você cria são seus. Ao usar a sincronização na nuvem (quando logado), você nos
        concede uma licença limitada para armazenar, sincronizar e exibir esse conteúdo com o único
        objetivo de operar o serviço para você. Você pode excluir seus decks a qualquer momento.
      </P>

      <H2>6. Propriedade intelectual de Magic</H2>
      <P>
        Magic: The Gathering, os nomes das cartas, as imagens e demais elementos são marcas e
        direitos autorais da Wizards of the Coast LLC. Este app é um projeto de fã, não-oficial, e
        não é afiliado nem endossado pela Wizards of the Coast. Os dados e imagens de cartas são
        obtidos do Scryfall, sujeitos aos termos deles.
      </P>

      <H2>7. Links e serviços de terceiros</H2>
      <P>
        O app pode conter links para serviços de terceiros (por exemplo, Scryfall, EDHREC, LigaMagic
        e TCGplayer), pelos quais não somos responsáveis. Alguns links de lojas podem ser links de
        afiliado, o que pode nos gerar uma comissão sem custo adicional para você.
      </P>

      <H2>8. Isenção de garantias</H2>
      <P>
        O serviço é fornecido "no estado em que se encontra", sem garantias de disponibilidade,
        exatidão ou adequação a um fim específico. Na máxima extensão permitida pela lei aplicável,
        não nos responsabilizamos por danos indiretos decorrentes do uso do serviço. Nada nestes
        Termos limita direitos que você tenha como consumidor pela legislação aplicável.
      </P>

      <H2>9. Alterações e encerramento</H2>
      <P>
        Podemos atualizar estes Termos; mudanças relevantes serão sinalizadas no app. Podemos
        suspender ou encerrar contas que violem estes Termos.
      </P>

      <H2>10. Lei aplicável</H2>
      <P>
        Estes Termos são regidos pelas leis da República Federativa do Brasil.
      </P>

      <H2>11. Contato</H2>
      <P>
        Para dúvidas sobre estes Termos, use a opção "Enviar feedback" no menu do app.
      </P>
    </LegalPage>
  );
}
