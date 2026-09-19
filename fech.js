 // ============================================================
    // FECHAR MENU AO CLICAR FORA
    // ============================================================
    
    document.addEventListener('click', function(event) {
        const menu = document.getElementById('menu');
        const botaoMenu = document.querySelector('.topo-menu-btn') || document.querySelector('.menu-btn');
        
        // Se o menu não existe, ignora
        if (!menu) return;
        
        // Verifica se o clique foi FORA do menu e FORA do botão de abrir
        const clicouNoMenu = menu.contains(event.target);
        const clicouNoBotao = botaoMenu && botaoMenu.contains(event.target);
        
        // Se o menu está aberto E o clique foi fora, fecha
        if (menu.classList.contains('ativo') && !clicouNoMenu && !clicouNoBotao) {
            menu.classList.remove('ativo');
        }
    });

    // ============================================================
    // FECHAR MENU AO PRESSIONAR ESC
    // ============================================================
    
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const menu = document.getElementById('menu');
            if (menu && menu.classList.contains('ativo')) {
                menu.classList.remove('ativo');
            }
        }
    });
