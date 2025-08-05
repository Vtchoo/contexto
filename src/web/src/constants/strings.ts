export const strings = {
  // General
  loading: 'Carregando...',
  error: 'Erro',
  retry: 'Tentar novamente',
  submit: 'Enviar',
  cancel: 'Cancelar',
  back: 'Voltar',
  next: 'Próximo',
  
  // Home page
  welcome: 'Bem-vindo ao Contexto',
  selectGameMode: 'Escolha um modo de jogo',
  
  // Game modes
  modes: {
    classic: 'Clássico',
    cooperative: 'Cooperativo',
    battleRoyale: 'Battle Royale',
    stop: 'Stop'
  },
  
  modeDescriptions: {
    classic: 'Descubra a palavra secreta usando pistas de contexto',
    cooperative: 'Trabalhe em equipe para encontrar a palavra',
    battleRoyale: 'Compita contra outros jogadores em tempo real',
    stop: 'Corrida contra o tempo para encontrar a palavra'
  },
  
  // Game interface
  game: {
    wordToGuess: 'Palavra para descobrir:',
    yourGuess: 'Sua tentativa',
    enterWord: 'Digite uma palavra...',
    guessCount: 'Tentativas: {{count}}',
    position: 'Posição',
    word: 'Palavra',
    similarity: 'Similaridade',
    noGuessesYet: 'Nenhuma tentativa ainda',
    congratulations: 'Parabéns!',
    youWon: 'Você descobriu a palavra!',
    youAllWon: 'Vocês descobriram a palavra!',
    gameOver: 'Fim de jogo',
    correctWord: 'A palavra correta era: {{word}}',
    giveUp: 'Desistir',
    newGame: 'Novo jogo',
    shareResult: 'Compartilhar resultado'
  },
  
  // Battle Royale specific
  battleRoyale: {
    playersRemaining: 'Jogadores restantes: {{count}}',
    roundsCompleted: 'Rodadas completadas: {{count}}',
    eliminated: 'Você foi eliminado!',
    winner: 'Você venceu!',
    waitingForPlayers: 'Aguardando outros jogadores...',
    roundStarting: 'Nova rodada começando em {{seconds}}s',
    timeRemaining: 'Tempo restante: {{time}}'
  },
  
  // Cooperative specific
  cooperative: {
    teamProgress: 'Progresso da equipe',
    playersInRoom: 'Jogadores na sala: {{count}}',
    recentGuesses: 'Tentativas recentes da equipe',
    someoneGuessed: '{{player}} tentou: {{word}}'
  },
  
  // Room management
  room: {
    createRoom: 'Criar sala',
    joinRoom: 'Entrar na sala',
    roomCode: 'Código da sala',
    enterRoomCode: 'Digite o código da sala...',
    roomNotFound: 'Sala não encontrada',
    roomFull: 'Sala lotada',
    leaveRoom: 'Sair da sala',
    invitePlayers: 'Convidar jogadores',
    copyRoomCode: 'Copiar código da sala',
    startGame: 'Iniciar jogo'
  },
  
  // Profile
  profile: {
    yourName: 'Seu nome',
    enterName: 'Digite seu nome...',
    gamesPlayed: 'Jogos jogados: {{count}}',
    averageGuesses: 'Média de tentativas: {{average}}',
    bestScore: 'Melhor pontuação: {{score}}',
    winRate: 'Taxa de vitória: {{rate}}%'
  },
  
  // Errors
  errors: {
    connectionLost: 'Conexão perdida. Tentando reconectar...',
    invalidWord: 'Palavra inválida',
    wordTooShort: 'Palavra muito curta (mínimo 2 letras)',
    wordTooLong: 'Palavra muito longa',
    alreadyGuessed: 'Você já tentou esta palavra',
    gameNotFound: 'Jogo não encontrado',
    serverError: 'Erro do servidor. Tente novamente.',
    networkError: 'Erro de rede. Verifique sua conexão.',
    authenticationFailed: 'Falha na autenticação. Recarregue a página.'
  },
  
  // Success messages
  success: {
    roomCreated: 'Sala criada com sucesso!',
    joinedRoom: 'Você entrou na sala!',
    gameStarted: 'Jogo iniciado!',
    wordSubmitted: 'Palavra enviada!'
  }
}

export type StringKey = keyof typeof strings
